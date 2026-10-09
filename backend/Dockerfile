# syntax=docker/dockerfile:1.7
# SuperApp BFF on Java 25. Build context: backend/

FROM eclipse-temurin:25-jdk-noble AS build
WORKDIR /src
COPY gradlew settings.gradle.kts build.gradle.kts ./
COPY gradle/ gradle/
RUN --mount=type=cache,id=gradle,target=/root/.gradle chmod +x gradlew && ./gradlew --no-daemon dependencies -q > /dev/null
COPY src/ src/
RUN --mount=type=cache,id=gradle,target=/root/.gradle ./gradlew --no-daemon bootJar -x test --console=plain \
 && java -Djarmode=tools -jar build/libs/superapp-backend.jar extract --layers --destination /app

FROM eclipse-temurin:25-jre-noble
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/* \
 && groupadd --system --gid 10001 app && useradd --system --uid 10001 --gid app --no-create-home app
WORKDIR /app
# Layers ordered from least to most frequently changing for cache-friendly rebuilds.
COPY --from=build /app/dependencies/ ./
COPY --from=build /app/spring-boot-loader/ ./
COPY --from=build /app/snapshot-dependencies/ ./
COPY --from=build /app/application/ ./
USER app
EXPOSE 8081 9090
# Java 25: compact object headers (JEP 519) cut heap usage; container-aware heap sizing.
ENV TZ=UTC \
    JAVA_TOOL_OPTIONS="-Duser.timezone=UTC -XX:+UseCompactObjectHeaders -XX:MaxRAMPercentage=75 -XX:+ExitOnOutOfMemoryError -Djava.security.egd=file:/dev/urandom"
ENTRYPOINT ["java", "-jar", "/app/superapp-backend.jar"]
