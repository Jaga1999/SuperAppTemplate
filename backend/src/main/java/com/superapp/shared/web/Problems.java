package com.superapp.shared.web;

import java.io.IOException;
import java.net.URI;

import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;

import tools.jackson.databind.json.JsonMapper;

/** Builds RFC 9457 problem details; also usable from servlet filters where controller advice doesn't apply. */
public final class Problems {

    private Problems() {
    }

    public static ProblemDetail of(HttpStatus status, String slug, String title, String detail) {
        var problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setType(URI.create(DomainException.TYPE_BASE + slug));
        problem.setTitle(title);
        return problem;
    }

    public static void write(HttpServletResponse response, JsonMapper json, HttpStatus status, String slug,
            String title, String detail) throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        json.writeValue(response.getOutputStream(), of(status, slug, title, detail));
    }
}
