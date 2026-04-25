@echo off
title KBase Full Services Runner
echo Dang khoi dong Discovery Server (Cong 8761)...
start "Discovery" java -jar kbase-discovery-server/target/kbase-discovery-server-1.0.0-SNAPSHOT.jar

echo Doi 15 giay cho Discovery Server khoi dong...
timeout /t 15

echo Dang khoi dong cac Microservices...
start "Auth" java -jar kbase-auth-service/target/kbase-auth-service-1.0.0-SNAPSHOT.jar
start "Project" java -jar kbase-project-service/target/kbase-project-service-1.0.0-SNAPSHOT.jar
start "Storage" java -jar kbase-storage-service/target/kbase-storage-service-1.0.0-SNAPSHOT.jar

timeout /t 10
echo Dang khoi dong API Gateway (Cong 8080)...
start "Gateway" java -jar kbase-api-gateway/target/kbase-api-gateway-1.0.0-SNAPSHOT.jar

echo [THANH CONG] Tat ca cac service dang chay trong cac cua so moi.
pause