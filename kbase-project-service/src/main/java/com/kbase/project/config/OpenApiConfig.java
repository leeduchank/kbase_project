package com.kbase.project.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI projectServiceOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("KBase Project Service API")
                        .version("1.0.0")
                        .description("Project workspace APIs for creating projects, managing members and invitations, reading notifications, and reviewing activity logs."))
                .addServersItem(new Server()
                        .url("/api")
                        .description("KBase API Gateway"))
                .components(new Components()
                        .addSecuritySchemes("bearerAuth", new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Paste a valid JWT access token returned by the Auth Service.")));
    }
}
