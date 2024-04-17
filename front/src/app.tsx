import { startAuthentication, startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { useCallback, useState } from 'react';

function App() {
    const [message, setMessage] = useState('')
    const [access_token, setAccessToken] = useState('')

    const onRegister = useCallback(async () => {
        // Reset success/error messages
        setMessage("")

        // GET registration options from the endpoint that calls
        // @simplewebauthn/server -> generateRegistrationOptions()
        const resp = await (await fetch(`/api/users/register/start?username=example`)).json();
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
            body: JSON.stringify({ ...attResp, requestId: resp.requestId }),
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
    }, [])

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
            body: JSON.stringify({ requestId: optionJson.requestId, ...asseResp }),
        });

        // Wait for the results of verification
        const verificationJSON = await verificationResp.json();

        console.log(verificationJSON)

        // Show UI appropriate for the `verified` status
        if (verificationJSON && verificationJSON.access_token) {
            setAccessToken(verificationJSON.access_token)
            setMessage('Success!')
        } else {
            setMessage(`Oh no, something went wrong! Response: <pre>${JSON.stringify(
                verificationJSON,
            )}</pre>`)
        }
    }, [])

    const onGetMe = useCallback(async () => {
        // Reset success/error messages
        setMessage("");

        console.warn(access_token)
        const resp = await fetch(`/api/users/me`, { headers: { Authorization: `Bearer ${access_token}` } })

        const respJson = await resp.json()

        setMessage(JSON.stringify(respJson))
    }, [access_token])

    return (
        <div className="App">
            <p>browserSupportsWebAuthn: {browserSupportsWebAuthn().toString()}</p>
            <p>Message: {message}</p>
            <p>Access token: {access_token}</p>
            <hr />
            <br />
            <button
                type="button"
                onClick={onRegister}
            >
                Register as user "example"
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
