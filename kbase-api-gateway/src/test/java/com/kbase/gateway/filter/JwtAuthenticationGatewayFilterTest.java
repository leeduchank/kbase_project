package com.kbase.gateway.filter;

import com.kbase.gateway.util.JwtTokenProvider;
import com.kbase.gateway.util.TokenBlacklist;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JwtAuthenticationGatewayFilterTest {

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private TokenBlacklist tokenBlacklist;

    @Mock
    private GatewayFilterChain chain;

    @Test
    void publicPathSkipsAuthentication() {
        JwtAuthenticationGatewayFilter filter = new JwtAuthenticationGatewayFilter(jwtTokenProvider, tokenBlacklist);
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.post("/api/auth/login").build());
        when(chain.filter(exchange)).thenReturn(Mono.empty());

        filter.filter(exchange, chain).block();

        verify(chain).filter(exchange);
        verify(jwtTokenProvider, never()).validateToken("anything");
    }

    @Test
    void missingTokenStripsSpoofedUserHeadersAndContinues() {
        JwtAuthenticationGatewayFilter filter = new JwtAuthenticationGatewayFilter(jwtTokenProvider, tokenBlacklist);
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/projects")
                        .header("X-User-Id", "spoofed")
                        .header("X-User-Email", "spoofed@example.com")
                        .header("X-User-Role", "ADMIN")
                        .build());
        when(chain.filter(org.mockito.ArgumentMatchers.any(ServerWebExchange.class))).thenReturn(Mono.empty());

        filter.filter(exchange, chain).block();

        ArgumentCaptor<ServerWebExchange> captor = ArgumentCaptor.forClass(ServerWebExchange.class);
        verify(chain).filter(captor.capture());
        HttpHeaders headers = captor.getValue().getRequest().getHeaders();
        assertThat(headers.containsKey("X-User-Id")).isFalse();
        assertThat(headers.containsKey("X-User-Email")).isFalse();
        assertThat(headers.containsKey("X-User-Role")).isFalse();
    }

    @Test
    void invalidTokenReturnsUnauthorized() {
        JwtAuthenticationGatewayFilter filter = new JwtAuthenticationGatewayFilter(jwtTokenProvider, tokenBlacklist);
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/projects")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer invalid-token")
                        .build());
        when(jwtTokenProvider.validateToken("invalid-token")).thenReturn(false);

        filter.filter(exchange, chain).block();

        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        verify(chain, never()).filter(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void blacklistedUserReturnsUnauthorized() {
        JwtAuthenticationGatewayFilter filter = new JwtAuthenticationGatewayFilter(jwtTokenProvider, tokenBlacklist);
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/projects")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer valid-token")
                        .build());
        when(jwtTokenProvider.validateToken("valid-token")).thenReturn(true);
        when(jwtTokenProvider.getUserIdFromToken("valid-token")).thenReturn("42");
        when(jwtTokenProvider.getEmailFromToken("valid-token")).thenReturn("user@example.com");
        when(jwtTokenProvider.getRoleFromToken("valid-token")).thenReturn("USER");
        when(tokenBlacklist.isBlacklisted("42")).thenReturn(Mono.just(true));

        filter.filter(exchange, chain).block();

        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        verify(chain, never()).filter(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void validTokenAddsTrustedUserHeaders() {
        JwtAuthenticationGatewayFilter filter = new JwtAuthenticationGatewayFilter(jwtTokenProvider, tokenBlacklist);
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/projects")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer valid-token")
                        .build());
        when(jwtTokenProvider.validateToken("valid-token")).thenReturn(true);
        when(jwtTokenProvider.getUserIdFromToken("valid-token")).thenReturn("42");
        when(jwtTokenProvider.getEmailFromToken("valid-token")).thenReturn("user@example.com");
        when(jwtTokenProvider.getRoleFromToken("valid-token")).thenReturn("ADMIN");
        when(tokenBlacklist.isBlacklisted("42")).thenReturn(Mono.just(false));
        when(chain.filter(org.mockito.ArgumentMatchers.any(ServerWebExchange.class))).thenReturn(Mono.empty());

        filter.filter(exchange, chain).block();

        ArgumentCaptor<ServerWebExchange> captor = ArgumentCaptor.forClass(ServerWebExchange.class);
        verify(chain).filter(captor.capture());
        HttpHeaders headers = captor.getValue().getRequest().getHeaders();
        assertThat(headers.getFirst("X-User-Id")).isEqualTo("42");
        assertThat(headers.getFirst("X-User-Email")).isEqualTo("user@example.com");
        assertThat(headers.getFirst("X-User-Role")).isEqualTo("ADMIN");
    }

    @Test
    void tokenCanBeReadFromQueryParameterForSseClients() {
        JwtAuthenticationGatewayFilter filter = new JwtAuthenticationGatewayFilter(jwtTokenProvider, tokenBlacklist);
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/notifications/stream?token=query-token").build());
        when(jwtTokenProvider.validateToken("query-token")).thenReturn(true);
        when(jwtTokenProvider.getUserIdFromToken("query-token")).thenReturn("42");
        when(jwtTokenProvider.getEmailFromToken("query-token")).thenReturn("user@example.com");
        when(jwtTokenProvider.getRoleFromToken("query-token")).thenReturn(null);
        when(tokenBlacklist.isBlacklisted("42")).thenReturn(Mono.just(false));
        when(chain.filter(org.mockito.ArgumentMatchers.any(ServerWebExchange.class))).thenReturn(Mono.empty());

        filter.filter(exchange, chain).block();

        ArgumentCaptor<ServerWebExchange> captor = ArgumentCaptor.forClass(ServerWebExchange.class);
        verify(chain).filter(captor.capture());
        assertThat(captor.getValue().getRequest().getHeaders().getFirst("X-User-Role")).isEqualTo("USER");
    }
}
