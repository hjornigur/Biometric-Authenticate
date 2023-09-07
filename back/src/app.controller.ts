import { Body, Controller, Get, Post } from '@nestjs/common'
import { AppService } from './app.service'
import type {
    RegistrationResponseJSON,
    AuthenticationResponseJSON
} from '@simplewebauthn/typescript-types'

@Controller('biometric')
export class AppController {
    constructor(private readonly appService: AppService) { }

    // @Authenticated
    @Get('/register/option')
    generateRegistrationOptions() {
        const username = 'example' // Get username via JWT token for example
        return this.appService.generateRegistrationOptions({ username })
    }

    // @Authenticated
    @Post('/register')
    verifyRegistration(
        @Body() body: RegistrationResponseJSON
    ) {
        const username = 'example' // Get username via JWT token for example
        return this.appService.verifyRegistration({ username, ...body })
    }

    // @Public
    @Get('/authenticate/option')
    generateAuthenticationOptions() {
        return this.appService.generateAuthenticationOptions()
    }

    // @Public
    @Post('/authenticate')
    verifyAuthentications(
        @Body() body: AuthenticationResponseJSON & { requestId: string }
    ) {
        return this.appService.verifyAuthentication(body)
    }
}
