import { startAuthentication, startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { useCallback, useEffect, useState } from 'react';

function App() {
    const [message, setMessage] = useState('')
    const [username, setUsername] = useState('')

    // useEffect(() => {
    //     (async () => {
    //         const resp = await fetch(`/api/biometric/authenticate/option?username=example`);

    //         let asseResp;
    //         try {
    //             // Pass the options to the authenticator and wait for a response
    //             asseResp = await startAuthentication(await resp.json(), true);
    //         } catch (error) {
    //             // Some basic error handling
    //             setMessage(JSON.stringify(error))
    //             throw error;
    //         }
    //     })()
    // }, [])

    const onRegister = useCallback(async () => {
        // Reset success/error messages
        setMessage("")

        // GET registration options from the endpoint that calls
        // @simplewebauthn/server -> generateRegistrationOptions()
        const resp = await fetch(`/api/biometric/register/option`);

        let attResp;
        try {
            // Pass the options to the authenticator and wait for a response
            attResp = await startRegistration(await resp.json());
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
        const verificationResp = await fetch(`/api/biometric/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(attResp),
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

    const onAuthentificate = useCallback(async () => {
        // Reset success/error messages
        setMessage("")

        // GET authentication options from the endpoint that calls
        // @simplewebauthn/server -> generateAuthenticationOptions()
        const resp = await fetch(`/api/biometric/authenticate/option?username=${username}`);

        let asseResp;
        try {
            // Pass the options to the authenticator and wait for a response
            asseResp = await startAuthentication(await resp.json());
        } catch (error) {
            // Some basic error handling
            setMessage(JSON.stringify(error))
            throw error;
        }

        // POST the response to the endpoint that calls
        // @simplewebauthn/server -> verifyAuthenticationResponse()
        const verificationResp = await fetch(`/api/biometric/authenticate?username=${username}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(asseResp),
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

    return (
        <div className="App">
            <p>browserSupportsWebAuthn: {browserSupportsWebAuthn().toString()}</p>
            <p>Message: {message}</p>
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
            <label>Username:</label>
            <br />
            <input
                value={username}
                name="username"
                autoComplete="webauthn username"
                onChange={({ target }) => setUsername(target.value)}
            />
            <button
                type="button"
                onClick={onAuthentificate}
            >
                Authentificate
            </button>
        </div>
    )
}

export default App
