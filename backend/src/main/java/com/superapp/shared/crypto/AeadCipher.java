package com.superapp.shared.crypto;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;
import java.util.Optional;

import javax.crypto.Cipher;
import javax.crypto.KDF;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.HKDFParameterSpec;

/**
 * Authenticated encryption (AES-256-GCM) for values that leave the server: cookies and cached tokens.
 *
 * <p>Each purpose gets its own key, derived from the master secret with HKDF-SHA256 (Java 25 {@link KDF} API),
 * and the purpose is also bound as associated data. A ciphertext minted for one cookie can therefore never be
 * replayed as another cookie, even though both come from the same master secret.
 *
 * <p>Wire format (base64url, no padding): {@code version(1) || iv(12) || ciphertext+tag}.
 */
public final class AeadCipher {

    private static final byte VERSION = 1;
    private static final int IV_BYTES = 12;
    private static final int TAG_BITS = 128;
    private static final byte[] SALT = "superapp/aead/v1".getBytes(StandardCharsets.UTF_8);
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Base64.Encoder ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder DECODER = Base64.getUrlDecoder();

    private final SecretKey key;
    private final byte[] associatedData;

    private AeadCipher(SecretKey key, String purpose) {
        this.key = key;
        this.associatedData = purpose.getBytes(StandardCharsets.UTF_8);
    }

    /**
     * Derives a purpose-bound cipher from the master secret.
     *
     * @param masterSecret at least 32 random bytes
     * @param purpose      stable label, e.g. {@code cookie:access-token}
     */
    public static AeadCipher forPurpose(byte[] masterSecret, String purpose) {
        if (masterSecret.length < 32) {
            throw new IllegalArgumentException("Master secret must be at least 32 bytes (got " + masterSecret.length + ")");
        }
        try {
            var hkdf = KDF.getInstance("HKDF-SHA256");
            var params = HKDFParameterSpec.ofExtract()
                    .addIKM(masterSecret)
                    .addSalt(SALT)
                    .thenExpand(purpose.getBytes(StandardCharsets.UTF_8), 32);
            return new AeadCipher(hkdf.deriveKey("AES", params), purpose);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("HKDF key derivation failed", e);
        }
    }

    public String encrypt(String plaintext) {
        try {
            var iv = new byte[IV_BYTES];
            RANDOM.nextBytes(iv);
            var cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
            cipher.updateAAD(associatedData);
            var sealed = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));

            var out = new byte[1 + IV_BYTES + sealed.length];
            out[0] = VERSION;
            System.arraycopy(iv, 0, out, 1, IV_BYTES);
            System.arraycopy(sealed, 0, out, 1 + IV_BYTES, sealed.length);
            return ENCODER.encodeToString(out);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Encryption failed", e);
        }
    }

    /** Returns empty for anything that is malformed, tampered with, or encrypted for another purpose. */
    public Optional<String> decrypt(String token) {
        try {
            var in = DECODER.decode(token);
            if (in.length <= 1 + IV_BYTES || in[0] != VERSION) {
                return Optional.empty();
            }
            var cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, Arrays.copyOfRange(in, 1, 1 + IV_BYTES)));
            cipher.updateAAD(associatedData);
            var plain = cipher.doFinal(in, 1 + IV_BYTES, in.length - 1 - IV_BYTES);
            return Optional.of(new String(plain, StandardCharsets.UTF_8));
        } catch (IllegalArgumentException | GeneralSecurityException _) {
            return Optional.empty();
        }
    }
}
