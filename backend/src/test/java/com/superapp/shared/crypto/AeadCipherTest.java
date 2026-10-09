package com.superapp.shared.crypto;

import java.security.SecureRandom;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AeadCipherTest {

    private static byte[] secret() {
        var bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return bytes;
    }

    @Test
    void roundTrips() {
        var cipher = AeadCipher.forPurpose(secret(), "cookie:access-token");
        var sealed = cipher.encrypt("hello");
        assertThat(sealed).doesNotContain("hello");
        assertThat(cipher.decrypt(sealed)).contains("hello");
    }

    @Test
    void sameInputEncryptsDifferentlyEachTime() {
        var cipher = AeadCipher.forPurpose(secret(), "p");
        assertThat(cipher.encrypt("x")).isNotEqualTo(cipher.encrypt("x"));
    }

    @Test
    void ciphertextIsBoundToItsPurpose() {
        var master = secret();
        var sealed = AeadCipher.forPurpose(master, "cookie:access-token").encrypt("token");
        assertThat(AeadCipher.forPurpose(master, "cookie:refresh-token").decrypt(sealed)).isEmpty();
    }

    @Test
    void rejectsTamperingAndGarbage() {
        var cipher = AeadCipher.forPurpose(secret(), "p");
        var sealed = cipher.encrypt("value");
        var flipped = sealed.substring(0, sealed.length() - 2) + (sealed.endsWith("A") ? "BB" : "AA");
        assertThat(cipher.decrypt(flipped)).isEmpty();
        assertThat(cipher.decrypt("not-base64-!!")).isEmpty();
        assertThat(cipher.decrypt("")).isEmpty();
    }

    @Test
    void refusesShortSecrets() {
        assertThatThrownBy(() -> AeadCipher.forPurpose(new byte[16], "p"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
