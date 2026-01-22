// Underchex - Kotlin/Java Implementation
// Signed-by: agent #23 claude-sonnet-4 via opencode 20260122T06:57:00

plugins {
    kotlin("jvm") version "2.0.0"
    application
}

group = "com.underchex"
version = "0.1.0"

repositories {
    mavenCentral()
}

dependencies {
    implementation(kotlin("stdlib"))
    testImplementation(kotlin("test"))
    testImplementation("org.junit.jupiter:junit-jupiter:5.10.0")
    // JSON parsing for cross-implementation tests
    testImplementation("com.google.code.gson:gson:2.10.1")
}

application {
    mainClass.set("com.underchex.MainKt")
}

tasks.test {
    useJUnitPlatform()
}

tasks.jar {
    manifest {
        attributes["Main-Class"] = "com.underchex.MainKt"
    }
    duplicatesStrategy = DuplicatesStrategy.EXCLUDE
    from(configurations.runtimeClasspath.get().map { if (it.isDirectory) it else zipTree(it) })
}

kotlin {
    jvmToolchain(21)
}
