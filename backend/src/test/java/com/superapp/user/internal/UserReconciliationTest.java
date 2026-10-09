package com.superapp.user.internal;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Limit;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.HttpClientErrorException;

import com.superapp.identity.IdentityDirectory;
import com.superapp.identity.IdentityDirectory.IdentityUser;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class UserReconciliationTest {

    private final AppUserRepository users = mock(AppUserRepository.class);
    private final IdentityDirectory directory = mock(IdentityDirectory.class);
    private final UserProjection projection = mock(UserProjection.class);
    private final StringRedisTemplate redis = mock(StringRedisTemplate.class);

    private final UUID present = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private final UUID gone1 = UUID.fromString("00000000-0000-0000-0000-000000000002");
    private final UUID gone2 = UUID.fromString("00000000-0000-0000-0000-000000000003");

    @BeforeEach
    void localUsers() {
        when(users.idsAfter(eq(new UUID(0, 0)), eq(AppUser.Status.DELETED), any(Limit.class)))
                .thenReturn(List.of(present, gone1, gone2));
        when(users.idsAfter(eq(gone2), eq(AppUser.Status.DELETED), any(Limit.class))).thenReturn(List.of());
        var user = new IdentityUser(present, "a@b.c", true, "A", "B", true, null);
        when(directory.findUser(present)).thenReturn(Optional.of(user));
        when(directory.findUser(gone1)).thenReturn(Optional.empty());
        when(directory.findUser(gone2)).thenReturn(Optional.empty());
    }

    @Test
    void syncsUsersKeycloakStillHasAndErasesTheOthers() {
        new UserReconciliation(users, directory, projection, redis, 50).run();

        verify(projection).sync(any(IdentityUser.class));
        verify(projection).erase(gone1);
        verify(projection).erase(gone2);
    }

    @Test
    void stopsAtTheErasureCap() {
        new UserReconciliation(users, directory, projection, redis, 1).run();

        verify(projection, times(1)).erase(any(UUID.class));
        verify(projection, never()).erase(gone2);
    }

    @Test
    void touchesNothingWhenTheRealmDoesNotAnswer() {
        when(directory.countUsers()).thenThrow(new HttpClientErrorException(HttpStatus.NOT_FOUND));

        assertThatThrownBy(() -> new UserReconciliation(users, directory, projection, redis, 50).run())
                .isInstanceOf(HttpClientErrorException.class);
        verify(projection, never()).erase(any(UUID.class));
        verify(projection, never()).sync(any(IdentityUser.class));
    }
}
