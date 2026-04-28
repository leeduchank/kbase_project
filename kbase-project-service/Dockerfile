# =====================================================
# Stage 1: Build with Maven (multi-module aware)
# =====================================================
FROM maven:3.9.9-eclipse-temurin-17 AS builder

WORKDIR /workspace

# Copy parent POM first for dependency caching
COPY pom.xml .

# Copy all module POMs (needed for dependency resolution)
COPY kbase-discovery-server/pom.xml ./kbase-discovery-server/pom.xml
COPY kbase-api-gateway/pom.xml ./kbase-api-gateway/pom.xml
COPY kbase-auth-service/pom.xml ./kbase-auth-service/pom.xml
COPY kbase-project-service/pom.xml ./kbase-project-service/pom.xml
COPY kbase-storage-service/pom.xml ./kbase-storage-service/pom.xml

# Download dependencies (cached unless POMs change)
RUN mvn dependency:go-offline -B || true

# Copy source for project-service only
COPY kbase-project-service/src ./kbase-project-service/src

# Build only this module and its dependencies
RUN mvn -pl kbase-project-service -am clean package -DskipTests -B

# =====================================================
# Stage 2: Lightweight JRE runtime
# =====================================================
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

COPY --from=builder /workspace/kbase-project-service/target/kbase-project-service-1.0.0-SNAPSHOT.jar /app/app.jar

EXPOSE 8083

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
