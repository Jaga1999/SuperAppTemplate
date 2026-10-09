// SuperApp Keycloak extensions (Java 25):
//  - superapp-kafka          event listener: user + admin events → Kafka
//  - superapp-legal-consent  required action: versioned Terms and Privacy Policy acceptance
// Output: build/providers/*.jar → copied into /opt/keycloak/providers by keycloak/Dockerfile.

plugins {
    java
}

group = "com.superapp"
version = "1.0.0"

val keycloakVersion = "26.8.0"
val kafkaVersion = "4.3.1"

java {
    // Java 25 everywhere: our Keycloak image runs on Temurin 25 (officially supported by Keycloak 26.x).
    toolchain { languageVersion = JavaLanguageVersion.of(25) }
}

tasks.withType<JavaCompile>().configureEach {
    options.release = 25
    options.compilerArgs.addAll(listOf("-Xlint:all", "-Werror", "-Xlint:-options", "-Xlint:-processing"))
}

repositories { mavenCentral() }

dependencies {
    // Provided by the Keycloak server at runtime
    compileOnly("org.keycloak:keycloak-server-spi:$keycloakVersion")
    compileOnly("org.keycloak:keycloak-server-spi-private:$keycloakVersion")
    compileOnly("org.keycloak:keycloak-core:$keycloakVersion")
    compileOnly("org.jboss.logging:jboss-logging:3.6.1.Final")
    compileOnly("jakarta.ws.rs:jakarta.ws.rs-api:3.1.0") // the exact version Keycloak 26.8 ships

    // Shipped next to the provider jar (slf4j is already on Keycloak's classpath)
    implementation("org.apache.kafka:kafka-clients:$kafkaVersion") {
        exclude(group = "org.slf4j")
    }

    testImplementation(platform("org.junit:junit-bom:6.1.3"))
    testImplementation("org.junit.jupiter:junit-jupiter")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
    testImplementation("org.keycloak:keycloak-server-spi:$keycloakVersion")
    testImplementation("org.keycloak:keycloak-server-spi-private:$keycloakVersion")
    testImplementation("org.keycloak:keycloak-core:$keycloakVersion")
    testImplementation("org.jboss.logging:jboss-logging:3.6.1.Final")
    testImplementation("jakarta.ws.rs:jakarta.ws.rs-api:3.1.0")
}

tasks.test {
    useJUnitPlatform()
    // The real documents must always parse: they are what Keycloak loads at startup.
    systemProperty("legal.dir", rootDir.resolve("../../../legal").canonicalPath)
}

val copyProviders by tasks.registering(Sync::class) {
    group = "build"
    description = "Collects the provider jar and its runtime dependencies for /opt/keycloak/providers."
    from(tasks.jar)
    from(configurations.runtimeClasspath)
    into(layout.buildDirectory.dir("providers"))
}

tasks.assemble { dependsOn(copyProviders) }
tasks.build { dependsOn(copyProviders) }
