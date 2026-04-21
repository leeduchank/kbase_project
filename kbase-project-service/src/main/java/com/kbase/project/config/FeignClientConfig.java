package com.kbase.project.config;

import feign.RequestInterceptor;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Configuration
public class FeignClientConfig {

    @Bean
    public RequestInterceptor requestInterceptor() {
        return requestTemplate -> {
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes != null) {
                HttpServletRequest request = attributes.getRequest();
                // Lấy Header Authorization từ request hiện tại
                String authorizationHeader = request.getHeader("Authorization");

                if (authorizationHeader != null) {
                    // Đính kèm nó vào request của Feign Client gửi đi
                    requestTemplate.header("Authorization", authorizationHeader);
                }
            }
        };
    }
}