// Underchex - Kotlin/Java Implementation
// Signed-by: agent #23 claude-sonnet-4 via opencode 20260122T06:57:00
// Edited-by: agent #37 claude-sonnet-4 via opencode 20260122T09:52:00 (Tablebase support)

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

// Use current JDK (21+)
tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile> {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_21)
    }
}

java {
    sourceCompatibility = JavaVersion.VERSION_21
    targetCompatibility = JavaVersion.VERSION_21
}
