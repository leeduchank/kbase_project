package com.kbase.project.config;

import com.kbase.project.dto.ActivityEvent;
import io.awspring.cloud.sqs.config.SqsMessageListenerContainerFactory;
import io.awspring.cloud.sqs.listener.SqsContainerOptionsBuilder;
import io.awspring.cloud.sqs.support.converter.SqsMessagingMessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.sqs.SqsAsyncClient;
import software.amazon.awssdk.services.sqs.SqsClient;

@Configuration
public class SqsConfig {

    @Value("${aws.region:ap-southeast-2}")
    private String awsRegion;

    @Value("${aws.access-key}")
    private String accessKey;

    @Value("${aws.secret-key}")
    private String secretKey;

    @Bean
    public SqsClient sqsClient() {
        return SqsClient.builder()
                .region(Region.of(awsRegion))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKey, secretKey)
                ))
                .build();
    }

    @Bean
    public SqsAsyncClient sqsAsyncClient() {
        return SqsAsyncClient.builder()
                .region(Region.of(awsRegion))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKey, secretKey)
                ))
                .build();
    }

    @Bean
    public SqsMessageListenerContainerFactory<Object> defaultSqsListenerContainerFactory(SqsAsyncClient sqsAsyncClient) {
        SqsMessagingMessageConverter converter = new SqsMessagingMessageConverter();
        // Map mọi message chứa "ActivityEvent" trong JavaType header -> ActivityEvent.class
        // Điều này xử lý cả message từ storage-service (com.kbase.storage.dto.ActivityEvent)
        // lẫn message từ project-service (com.kbase.project.dto.ActivityEvent)
        converter.setPayloadTypeMapper(message -> ActivityEvent.class);

        return SqsMessageListenerContainerFactory
                .builder()
                .sqsAsyncClient(sqsAsyncClient)
                .configure(options -> options.messageConverter(converter))
                .build();
    }
}
