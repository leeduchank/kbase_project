FROM maven:3.9.9-eclipse-temurin-17 AS builder
WORKDIR /workspace
COPY pom.xml .
COPY kbase-discovery-server ./kbase-discovery-server
COPY kbase-api-gateway ./kbase-api-gateway
COPY kbase-auth-service ./kbase-auth-service
COPY kbase-project-service ./kbase-project-service
COPY kbase-storage-service ./kbase-storage-service
RUN mvn -pl kbase-project-service -am clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /workspace/kbase-project-service/target/kbase-project-service-1.0.0-SNAPSHOT.jar /app/app.jar
EXPOSE 8083
ENTRYPOINT ["java","-jar","/app/app.jar"]
