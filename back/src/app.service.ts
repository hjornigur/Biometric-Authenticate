import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import {
    generateAuthenticationOptions,
    generateRegistrationOptions,
    verifyAuthenticationResponse,
    verifyRegistrationResponse,
} from '@simplewebauthn/server'
import type {
    RegistrationResponseJSON,
    AuthenticationResponseJSON,
    AuthenticatorDevice,
} from '@simplewebauthn/typescript-types'
import { isoUint8Array } from '@simplewebauthn/server/helpers'
import { v4 as uuidv4 } from 'uuid'

type UserModel = {
    id: string;
    username: string;
    currentChallenge?: string;
    authentificatorDevices: AuthenticatorDevice[]
}

// Human-readable title for your website
const rpName = 'SimpleWebAuthn Example'
// A unique identifier for your website
const rpID = 'localhost'
// The URL at which registrations and authentications should occur
const origin = `https://${rpID}:3000`

@Injectable()
export class AppService {
    db = {
        users: [
            {
                id: '1',
                username: "example",
                currentChallenge: '',
                authentificatorDevices: [],
            },
        ] as UserModel[],
    }

    // TODO expire challenges
    challenges: { [key: string]: string } = {}

    /**
     * GenerateRegistrationOptions
     */
    generateRegistrationOptions({ username }: { username: string }) {
        const index = this.db.users.findIndex(x => x.username === username)

        if (index === -1)
            throw new NotFoundException()

        // Retrieve the user from the database after they've logged in
        const user = this.db.users[index]

        const options = generateRegistrationOptions({
            timeout: 60000,
            rpName,
            rpID,
            userID: user.id,
            userName: user.username,
            // Don't prompt users for additional information about the authenticator (Recommended for smoother UX)
            attestationType: 'none',
            /**
             * Passing in a user's list of already-registered authenticator IDs here prevents users from
             * registering the same device multiple times. The authenticator will simply throw an error in
             * the browser if it's asked to perform registration when one of these ID's already resides
             * on it.
             */
            excludeCredentials: user.authentificatorDevices.map((authenticator) => ({
                id: authenticator.credentialID,
                type: 'public-key',
                transports: authenticator.transports,
            })),
            authenticatorSelection: {
                residentKey: 'required',
                userVerification: 'preferred',
            },
            // Support the two most common algorithms: ES256, and RS256
            supportedAlgorithmIDs: [-7, -257],
        })

        // Remember the challenge for this user
        this.db.users[index].currentChallenge = options.challenge

        return options
    }

    async verifyRegistration({ username, ...body }: RegistrationResponseJSON & { username: string }) {
        const index = this.db.users.findIndex(x => x.username === username)

        if (index === -1)
            throw new NotFoundException()

        // Retrieve the user from the database after they've logged in
        const user = this.db.users[index]

        try {
            const {
                verified,
                registrationInfo: { credentialPublicKey, credentialID, counter }
            } = await verifyRegistrationResponse({
                response: body,
                expectedChallenge: user.currentChallenge,
                expectedOrigin: origin,
                expectedRPID: rpID,
                requireUserVerification: true,
            })

            if (verified) {
                const existingDevice = user.authentificatorDevices.find(x => isoUint8Array.areEqual(x.credentialID, credentialID))

                if (!existingDevice) {
                    /**
                     * Add the returned device to the user's list of devices
                     */
                    const newAuthenticator: AuthenticatorDevice = {
                        credentialPublicKey,
                        credentialID,
                        counter,
                        transports: body.response.transports as AuthenticatorTransport[],
                    }

                    this.db.users[index].authentificatorDevices.push(newAuthenticator)
                }
            }


            return { verified }
        } catch (error) {
            console.error(error)
            throw new BadRequestException(error.message)
        }
    }

    /**
     * GenerateAuthenticationOptions
     */
    generateAuthenticationOptions() {
        const options = generateAuthenticationOptions({
            timeout: 60000,
            userVerification: 'preferred',
            rpID,
        })

        const uuid = uuidv4()

        // Store challenge
        this.challenges[uuid] = options.challenge

        return {
            requestId: uuid,
            options,
        }
    }

    async verifyAuthentication({ requestId, ...body }: AuthenticationResponseJSON & { requestId: string }) {
        const bodyCredIDBuffer = Buffer.from(body.rawId, 'base64url')

        const index = this.db.users.findIndex(usr => usr.authentificatorDevices.some(x => isoUint8Array.areEqual(x.credentialID, bodyCredIDBuffer)))

        if (index === -1)
            throw new NotFoundException()

        // Retrieve the user from the database after they've logged in
        const user = this.db.users[index]

        const authenticatorIndex = user.authentificatorDevices.findIndex(x => isoUint8Array.areEqual(x.credentialID, bodyCredIDBuffer))

        const authenticator = user.authentificatorDevices[index]

        if (!authenticator)
            throw new NotFoundException(`Could not find authenticator ${body.id} for user ${user.id}`)

        try {
            const {
                verified,
                authenticationInfo: { newCounter },
            } = await verifyAuthenticationResponse({
                response: body,
                expectedChallenge: this.challenges[requestId],
                expectedOrigin: origin,
                expectedRPID: rpID,
                authenticator,
                requireUserVerification: true,
            })

            if (verified) {
                // Update counter
                this.db.users[index].authentificatorDevices[authenticatorIndex].counter = newCounter
            }

            // Delete challenge
            delete this.challenges[requestId]

            return { verified }
        } catch (error) {
            // Delete challenge
            delete this.challenges[requestId]

            console.error(error)
            throw new BadRequestException(error.message)
        }
    }
}
