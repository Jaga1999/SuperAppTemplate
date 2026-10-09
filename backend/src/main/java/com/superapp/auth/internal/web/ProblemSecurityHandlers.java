package com.superapp.auth.internal.web;

import org.springframework.http.HttpStatus;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;

import com.superapp.shared.web.Problems;

import tools.jackson.databind.json.JsonMapper;

/** 401/403 for the API as problem details (never redirects; the SPA decides where to send the user). */
public final class ProblemSecurityHandlers {

    private ProblemSecurityHandlers() {
    }

    public static AuthenticationEntryPoint unauthorized(JsonMapper json) {
        return (request, response, _) -> Problems.write(response, json, HttpStatus.UNAUTHORIZED,
                "unauthenticated", "Sign-in required", "Your session has ended. Please sign in again.");
    }

    public static AccessDeniedHandler forbidden(JsonMapper json) {
        return (request, response, _) -> Problems.write(response, json, HttpStatus.FORBIDDEN,
                "forbidden", "Forbidden", "You don't have permission to do that.");
    }
}
