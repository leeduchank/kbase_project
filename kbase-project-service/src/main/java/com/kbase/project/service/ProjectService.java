package com.kbase.project.service;

import com.kbase.project.client.AuthServiceWrapper;
import com.kbase.project.client.dto.UserInternalDTO;
import com.kbase.project.dto.ActivityEvent;
import com.kbase.project.dto.ProjectDto;
import com.kbase.project.dto.ProjectMemberDto;
import com.kbase.project.entity.Project;
import com.kbase.project.entity.ProjectMember;
import com.kbase.project.exception.ResourceNotFoundException;
import com.kbase.project.repository.ActivityRepository;
import com.kbase.project.repository.ProjectInvitationRepository;
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
    private final ProjectInvitationRepository projectInvitationRepository;
    private final ActivityRepository activityRepository;
    private final AuthServiceWrapper authServiceWrapper;
    private final ActivityLogService activityLogService;

    public ProjectService(ProjectRepository projectRepository,
            ProjectMemberRepository projectMemberRepository,
            ProjectInvitationRepository projectInvitationRepository,
            ActivityRepository activityRepository,
            AuthServiceWrapper authServiceWrapper,
            ActivityLogService activityLogService) {
        this.projectRepository = projectRepository;
        this.projectMemberRepository = projectMemberRepository;
        this.projectInvitationRepository = projectInvitationRepository;
        this.activityRepository = activityRepository;
        this.authServiceWrapper = authServiceWrapper;
        this.activityLogService = activityLogService;
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

        // Xóa các bản ghi liên quan để tránh lỗi Foreign Key
        projectInvitationRepository.deleteByProject_Id(projectId);
        activityRepository.deleteByProjectId(projectId);

        projectRepository.delete(project);
        log.info("Project deleted successfully: {}", projectId);
    }

    @RequireSystemRole({"ADMIN"})
    public void deleteProjectAsAdmin(Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + projectId));

        // Xóa các bản ghi liên quan để tránh lỗi Foreign Key
        projectInvitationRepository.deleteByProject_Id(projectId);
        activityRepository.deleteByProjectId(projectId);

        projectRepository.delete(project);
        log.info("Project deleted successfully by Admin: {}", projectId);
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

        // Bắn Activity event vào SQS (không block luồng chính)
        try {
            activityLogService.logActivityEvent(ActivityEvent.builder()
                    .projectId(projectId)
                    .userId(SecurityUtils.getCurrentUserId())
                    .action("ADD_MEMBER")
                    .targetName(authUser.email())
                    .build());
        } catch (Exception e) {
            log.error("Lỗi khi gửi ADD_MEMBER event vào SQS: {}", e.getMessage(), e);
        }

        log.info("Project member {} ({}) added to project {} by {} with role {}",
                authUser.fullName(), authUser.email(), projectId, SecurityUtils.getCurrentUserId(), role);
    }

    public List<ProjectMemberDto> getProjectMembers(Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + projectId));

        List<ProjectMember> members = projectMemberRepository.findByProject_Id(projectId);

        // 3. Map sang DTO và gọi Auth Service lấy Email, Tên
        return members.stream().map(member -> {
            UserInternalDTO userDetails = authServiceWrapper.getInternalUser(member.getMemberId());

            return ProjectMemberDto.builder()
                    .memberId(member.getMemberId())
                    .role(member.getRole())
                    .email(userDetails != null ? userDetails.email() : "Unknown Email")
                    .fullName(userDetails != null ? userDetails.fullName() : "Unknown User")
                    .joinedAt(member.getCreatedAt())
                    .build();
        }).collect(Collectors.toList());
    }

    @RequireProjectRole(value = { ProjectMemberRole.OWNER }, projectIdArgIndex = 0)
    @Transactional
    public void updateMemberRole(Long projectId, String memberId, ProjectMemberRole newRole) {
        ProjectMember member = projectMemberRepository.findByProject_IdAndMemberId(projectId, memberId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thành viên trong dự án này"));

        if (member.getRole() == ProjectMemberRole.OWNER) {
            throw new IllegalArgumentException("Không thể thay đổi quyền của Owner dự án");
        }

        if (newRole == ProjectMemberRole.OWNER) {
            throw new IllegalArgumentException("Không thể cấp quyền Owner thông qua chức năng này");
        }

        member.setRole(newRole);
        projectMemberRepository.save(member);
        log.info("Cập nhật quyền thành công: Project={}, Member={}, NewRole={}", projectId, memberId, newRole);
    }

    @RequireProjectRole(value = { ProjectMemberRole.OWNER }, projectIdArgIndex = 0)
    @Transactional
    public void removeMember(Long projectId, String memberId) {
        ProjectMember member = projectMemberRepository.findByProject_IdAndMemberId(projectId, memberId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thành viên trong dự án này"));

        if (member.getRole() == ProjectMemberRole.OWNER) {
            throw new IllegalArgumentException("Không thể xóa Owner khỏi dự án");
        }

        projectMemberRepository.delete(member);
        log.info("Xóa thành viên thành công: Project={}, Member={}", projectId, memberId);
    }

    @RequireProjectRole(value = { ProjectMemberRole.OWNER }, projectIdArgIndex = 0)
    @Transactional
    public void transferOwnership(Long projectId, String newOwnerId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dự án"));

        String currentOwnerId = SecurityUtils.getCurrentUserId();
        if (currentOwnerId.equals(newOwnerId)) {
            throw new IllegalArgumentException("Bạn đã là Owner của dự án này");
        }

        ProjectMember newOwnerMember = projectMemberRepository.findByProject_IdAndMemberId(projectId, newOwnerId)
                .orElseThrow(() -> new ResourceNotFoundException("Người nhận bàn giao không phải là thành viên của dự án"));

        ProjectMember currentOwnerMember = projectMemberRepository.findByProject_IdAndMemberId(projectId, currentOwnerId)
                .orElseThrow(() -> new ResourceNotFoundException("Lỗi: Không tìm thấy quyền Owner hiện tại"));

        // 1. Cập nhật Entity Project
        project.setOwnerId(newOwnerId);
        projectRepository.save(project);

        // 2. Chuyển Owner cũ thành Editor
        currentOwnerMember.setRole(ProjectMemberRole.EDITOR);
        projectMemberRepository.save(currentOwnerMember);

        // 3. Chuyển Member mới thành Owner
        newOwnerMember.setRole(ProjectMemberRole.OWNER);
        projectMemberRepository.save(newOwnerMember);

        log.info("Bàn giao quyền Owner thành công: Project={}, OldOwner={}, NewOwner={}", projectId, currentOwnerId, newOwnerId);
    }

    @RequireSystemRole({"ADMIN"})
    @Transactional
    public void transferOwnershipAsAdmin(Long projectId, String newOwnerId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dự án"));

        String currentOwnerId = project.getOwnerId();
        if (currentOwnerId != null && currentOwnerId.equals(newOwnerId)) {
            throw new IllegalArgumentException("Người dùng này đã là Owner của dự án.");
        }

        // Đảm bảo người nhận bàn giao tồn tại trong hệ thống
        UserInternalDTO authUser = authServiceWrapper.getInternalUser(newOwnerId);
        if (authUser == null) {
            throw new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + newOwnerId + " trên hệ thống.");
        }

        // Lấy hoặc tạo mới ProjectMember cho New Owner
        ProjectMember newOwnerMember = projectMemberRepository.findByProject_IdAndMemberId(projectId, newOwnerId)
                .orElseGet(() -> {
                    ProjectMember pm = ProjectMember.builder()
                            .project(project)
                            .memberId(newOwnerId)
                            .role(ProjectMemberRole.OWNER)
                            .build();
                    return projectMemberRepository.save(pm);
                });

        // Hạ quyền Owner cũ nếu có
        if (currentOwnerId != null) {
            projectMemberRepository.findByProject_IdAndMemberId(projectId, currentOwnerId).ifPresent(oldOwnerMember -> {
                oldOwnerMember.setRole(ProjectMemberRole.EDITOR);
                projectMemberRepository.save(oldOwnerMember);
            });
        }

        // Cập nhật Project
        project.setOwnerId(newOwnerId);
        projectRepository.save(project);
        
        // Nâng quyền New Owner
        newOwnerMember.setRole(ProjectMemberRole.OWNER);
        projectMemberRepository.save(newOwnerMember);

        log.info("Admin cưỡng chế bàn giao quyền Owner: Project={}, OldOwner={}, NewOwner={}", projectId, currentOwnerId, newOwnerId);
    }
}
