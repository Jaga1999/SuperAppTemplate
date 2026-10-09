package com.superapp.identity.internal;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.superapp.identity.internal.docs.PublicConfigApiDocs;

/** Unauthenticated, cacheable feature flags for the landing page (e.g. whether to show "Continue with Google"). */
@RestController
@RequestMapping(path = "/api/{version}/public", version = "1")
public class PublicConfigController implements PublicConfigApiDocs {

    private final IdentityProperties identity;

    PublicConfigController(IdentityProperties identity) {
        this.identity = identity;
    }

    public record PublicConfig(boolean googleLoginEnabled) {
    }

    @GetMapping("/config")
    @Override
    public PublicConfig config() {
        return new PublicConfig(identity.googleLoginEnabled());
    }
}
