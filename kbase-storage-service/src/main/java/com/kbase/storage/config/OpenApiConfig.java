package com.kbase.storage.config;

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
    public OpenAPI storageServiceOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("KBase Storage Service API")
                        .version("1.0.0")
                        .description("File storage APIs for uploading, listing, downloading, previewing, trashing, restoring, and permanently deleting project documents."))
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
