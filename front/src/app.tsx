import { startAuthentication, startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { useCallback, useState } from 'react';

function App() {
    const [message, setMessage] = useState('')
    const [accessToken, setAccessToken] = useState('')
    const [username, setUsername] = useState('')

    const onRegister = useCallback(async () => {
        // Reset success/error messages
        setMessage("")

        // GET registration options from the endpoint that calls
        // @simplewebauthn/server -> generateRegistrationOptions()
        const resp = await (await fetch(`/api/users/register/start?username=${username}`)).json();
        console.warn(resp)

        let attResp;
        try {
            // Pass the options to the authenticator and wait for a response
            attResp = await startRegistration(resp.options);
        } catch (error: any) {
            // Some basic error handling
            if (error.name === 'InvalidStateError') {
                setMessage('Error: Authenticator was probably already registered by user')
            } else {
                setMessage(JSON.stringify(error))
            }

            throw error;
        }

        // POST the response to the endpoint that calls
        // @simplewebauthn/server -> verifyRegistrationResponse()
        const verificationResp = await fetch(`/api/users/register/complete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ registrationResponse: attResp, requestId: resp.requestId }),
        });

        // Wait for the results of verification
        const verificationJSON = await verificationResp.json();

        // Show UI appropriate for the `verified` status
        if (verificationJSON && verificationJSON.verified) {
            setMessage('Success!')
        } else {
            setMessage(`Oh no, something went wrong! Response: <pre>${JSON.stringify(
                verificationJSON,
            )}</pre>`)
        }
    }, [username])

    const onAuthenticate = useCallback(async () => {
        // Reset success/error messages
        setMessage("")

        // GET authentication options from the endpoint that calls
        // @simplewebauthn/server -> generateAuthenticationOptions()
        const resp = await fetch(`/api/auth/start`);

        const optionJson = await resp.json()

        let asseResp;
        try {
            // Pass the options to the authenticator and wait for a response
            asseResp = await startAuthentication(optionJson.options);
        } catch (error) {
            // Some basic error handling
            setMessage(JSON.stringify(error))
            throw error;
        }

        // POST the response to the endpoint that calls
        // @simplewebauthn/server -> verifyAuthenticationResponse()
        const verificationResp = await fetch(`/api/auth/complete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ requestId: optionJson.requestId, authenticationResponse: asseResp }),
        });

        // Wait for the results of verification
        const verificationJSON = await verificationResp.json();

        console.log(verificationJSON)

        // Show UI appropriate for the `verified` status
        if (verificationJSON && verificationJSON.accessToken) {
            setAccessToken(verificationJSON.accessToken)
            setMessage('Success!')

            window.postMessage({ type: 'TOKEN_MESSAGE', token: verificationJSON.accessToken }, '*');
        } else {
            setMessage(`Oh no, something went wrong! Response: <pre>${JSON.stringify(
                verificationJSON,
            )}</pre>`)
        }
    }, [])

    const onGetMe = useCallback(async () => {
        // Reset success/error messages
        setMessage("");

        console.warn(accessToken)
        const resp = await fetch(`/api/users/me`, { headers: { Authorization: `Bearer ${accessToken}` } })

        const respJson = await resp.json()

        setMessage(JSON.stringify(respJson))
    }, [accessToken])

    return (
        <div className="App">
            <p>browserSupportsWebAuthn: {browserSupportsWebAuthn().toString()}</p>
            <p>Message: {message}</p>
            <p>Access token: {accessToken}</p>
            <hr />
            <br />
            <input
                value={username}
                onChange={(event) => {
                setUsername(event.target.value);
                }}
            />
            <button
                type="button"
                onClick={onRegister}
            >
                Register as user "{username}"
            </button>
            <br />
            <br />
            <hr />
            <br />
            <button
                type="button"
                onClick={onAuthenticate}
            >
                Authenticate
            </button>

            <br />
            <br />
            <hr />
            <br />
            <button
                type="button"
                onClick={onGetMe}
            >
                Get my user info (protected route)
            </button>
        </div>
    )
}

export default App
