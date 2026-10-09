package com.superapp.identity.internal;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/** {@code superapp.identity.*} — product-level identity switches surfaced to the SPA. */
@ConfigurationProperties("superapp.identity")
record IdentityProperties(@DefaultValue("false") boolean googleLoginEnabled) {
}
