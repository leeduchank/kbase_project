package com.kbase.project.service;

import com.kbase.project.client.AuthServiceWrapper;
import com.kbase.project.client.dto.UserInternalDTO;
import com.kbase.project.dto.ProjectDto;
import com.kbase.project.entity.Project;
import com.kbase.project.entity.ProjectMember;
import com.kbase.project.exception.ResourceNotFoundException;
import com.kbase.project.repository.ProjectMemberRepository;
import com.kbase.project.repository.ProjectRepository;
import com.kbase.project.security.ProjectMemberRole;
import com.kbase.project.security.RequireProjectRole;
import com.kbase.project.security.RequireSystemRole;
import com.kbase.project.security.SecurityUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@Transactional
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final AuthServiceWrapper authServiceWrapper;

    public ProjectService(ProjectRepository projectRepository,
            ProjectMemberRepository projectMemberRepository,
            AuthServiceWrapper authServiceWrapper) {
        this.projectRepository = projectRepository;
        this.projectMemberRepository = projectMemberRepository;
        this.authServiceWrapper = authServiceWrapper;
    }

    @RequireSystemRole({ "USER" })
    public ProjectDto createProject(String name, String description) {
        String ownerId = SecurityUtils.getCurrentUserId();

        Project project = Project.builder()
                .name(name)
                .description(description)
                .ownerId(ownerId)
                .active(true)
                .build();

        project = projectRepository.save(project);

        ProjectMember ownerMembership = ProjectMember.builder()
                .project(project)
                .memberId(ownerId)
                .role(ProjectMemberRole.OWNER)
                .build();
        projectMemberRepository.save(ownerMembership);

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

    public List<ProjectDto> getAllProjects() {
        List<ProjectDto> projectDtoList = new ArrayList<>();
        List<Project> projectList = projectRepository.findAll();
        if (projectList == null)
            return null;
        for (Project project : projectList) {
            projectDtoList.add(ProjectDto.fromEntity(project));
        }
        return projectDtoList;
    }

    public List<ProjectDto> getAllMyProjects() {
        String currentUserId = SecurityUtils.getCurrentUserId();

        List<Project> projects = projectRepository.findAllByMemberUserId(currentUserId);

        return projects.stream()
                .map(ProjectDto::fromEntity)
                .collect(Collectors.toList());
    }

    @RequireProjectRole(value = { ProjectMemberRole.OWNER, ProjectMemberRole.EDITOR }, projectIdArgIndex = 0)
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

    @RequireProjectRole(value = ProjectMemberRole.OWNER, projectIdArgIndex = 0)
    public void deleteProject(Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + projectId));

        projectRepository.delete(project);
        log.info("Project deleted successfully: {}", projectId);
    }

    @RequireProjectRole(value = ProjectMemberRole.OWNER, projectIdArgIndex = 0)
    @Transactional // Nên có Transactional để đảm bảo tính toàn vẹn dữ liệu
    public void addMember(Long projectId, String memberId, ProjectMemberRole role) {
        if (memberId == null || memberId.trim().isEmpty()) {
            throw new IllegalArgumentException("ID thành viên không được để trống.");
        }
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + projectId));

        UserInternalDTO authUser = authServiceWrapper.getInternalUser(memberId);
        if (authUser == null) {
            throw new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + memberId + " trên hệ thống.");
        }

        if (project.getOwnerId().equals(memberId)) {
            throw new IllegalArgumentException("Người sở hữu (Owner) mặc định đã là thành viên.");
        }

        if (projectMemberRepository.existsByProject_IdAndMemberId(projectId, memberId)) {
            throw new IllegalArgumentException("Người dùng này đã là thành viên của dự án rồi.");
        }

        ProjectMember projectMember = ProjectMember.builder()
                .project(project)
                .memberId(memberId)
                .role(role)
                .build();

        projectMemberRepository.save(projectMember);

        log.info("Project member {} ({}) added to project {} by {} with role {}",
                authUser.fullName(), authUser.email(), projectId, SecurityUtils.getCurrentUserId(), role);
    }
}
