import { Body, Controller, Get, Post, Query, Redirect } from '@nestjs/common'
import { AppService } from './app.service'
import type {
    RegistrationResponseJSON,
    AuthenticationResponseJSON
} from '@simplewebauthn/typescript-types'

@Controller('biometric')
export class AppController {
    constructor(private readonly appService: AppService) { }

    // @Authentificated
    @Get('/register/option')
    generateRegistrationOptions() {
        const username = 'example' // Get username via JWT token for example
        return this.appService.generateRegistrationOptions({ username })
    }

    // @Authentificated
    @Post('/register')
    verifyRegistration(
        @Body() body: RegistrationResponseJSON
    ) {
        const username = 'example' // Get username via JWT token for example
        return this.appService.verifyRegistration({ username, ...body })
    }

    // @Public
    @Get('/authenticate/option')
    generateAuthenticationOptions(
        @Query('username') username: string
    ) {
        return this.appService.generateAuthenticationOptions({ username })
    }

    // @Public
    @Post('/authenticate')
    @Redirect('/authenticate/test')
    verifyAuthentications(
        @Query('username') username: string,
        @Body() body: AuthenticationResponseJSON
    ) {
        return this.appService.verifyAuthentication({ username, ...body })
    }
}
