package com.kbase.project.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateProjectRequest {

    @NotBlank(message = "Tên dự án không được để trống")
    private String name;

    @Size(max = 500, message = "Mô tả dự án không được vượt quá 500 ký tự")
    private String description;
}