package com.kbase.project.service;

import com.kbase.project.exception.ResourceNotFoundException;
import com.kbase.project.dto.ProjectDto;
import com.kbase.project.entity.Project;
import com.kbase.project.repository.ProjectRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@Transactional
public class ProjectService {

    private final ProjectRepository projectRepository;

    public ProjectService(ProjectRepository projectRepository) {
        this.projectRepository = projectRepository;
    }

    public ProjectDto createProject(String name, String description, String ownerId) {
        Project project = Project.builder()
                .name(name)
                .description(description)
                .ownerId(ownerId)
                .active(true)
                .build();

        project = projectRepository.save(project);
        log.info("Project created successfully: {}", project.getId());
        return ProjectDto.fromEntity(project);
    }

    public ProjectDto getProject(Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + projectId));
        return ProjectDto.fromEntity(project);
    }

    public List<ProjectDto> getProjectsByOwner(String ownerId) {
        return projectRepository.findByOwnerId(ownerId)
                .stream()
                .map(ProjectDto::fromEntity)
                .collect(Collectors.toList());
    }

    public ProjectDto updateProject(Long projectId, String name, String description) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + projectId));

        if (name != null) {
            project.setName(name);
        }
        if (description != null) {
            project.setDescription(description);
        }

        project = projectRepository.save(project);
        log.info("Project updated successfully: {}", projectId);
        return ProjectDto.fromEntity(project);
    }

    public void deleteProject(Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + projectId));

        projectRepository.delete(project);
        log.info("Project deleted successfully: {}", projectId);
    }
}
