package com.superapp.auth.internal.web;

import java.io.IOException;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.filter.OncePerRequestFilter;

import com.superapp.auth.internal.token.CookieBearerTokenResolver;

/**
 * Runs immediately after {@code CsrfFilter}, i.e. only for requests that passed CSRF validation.
 * <ol>
 *   <li>Marks the request as CSRF-verified so {@link CookieBearerTokenResolver} may now read the session cookie.</li>
 *   <li>Touches the (lazily loaded) CSRF token so the SPA always receives a current {@code XSRF-TOKEN} cookie.</li>
 * </ol>
 */
public class CsrfCookieFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        request.setAttribute(CookieBearerTokenResolver.CSRF_VERIFIED, Boolean.TRUE);
        if (request.getAttribute(CsrfToken.class.getName()) instanceof CsrfToken token) {
            token.getToken();
        }
        chain.doFilter(request, response);
    }
}
