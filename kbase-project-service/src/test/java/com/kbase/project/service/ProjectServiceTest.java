package com.kbase.project.service;

import com.kbase.project.client.AuthServiceWrapper;
import com.kbase.project.client.StorageServiceWrapper;
import com.kbase.project.client.dto.UserInternalDTO;
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
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProjectServiceTest {

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private ProjectMemberRepository projectMemberRepository;

    @Mock
    private ProjectInvitationRepository projectInvitationRepository;

    @Mock
    private ActivityRepository activityRepository;

    @Mock
    private AuthServiceWrapper authServiceWrapper;

    @Mock
    private ActivityLogService activityLogService;

    @Mock
    private StorageServiceWrapper storageServiceWrapper;

    @InjectMocks
    private ProjectService projectService;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("owner-1", null,
                        List.of(new SimpleGrantedAuthority("ROLE_USER"))));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void createProjectCreatesOwnerMembership() {
        Project savedProject = Project.builder()
                .id(1L)
                .name("KBase")
                .description("Docs")
                .ownerId("owner-1")
                .active(true)
                .build();
        when(projectRepository.existsByNameAndOwnerId("KBase", "owner-1")).thenReturn(false);
        when(projectRepository.save(any(Project.class))).thenReturn(savedProject);

        ProjectDto dto = projectService.createProject("KBase", "Docs");

        assertThat(dto.getId()).isEqualTo(1L);
        assertThat(dto.getOwnerId()).isEqualTo("owner-1");

        ArgumentCaptor<ProjectMember> memberCaptor = ArgumentCaptor.forClass(ProjectMember.class);
        verify(projectMemberRepository).save(memberCaptor.capture());
        assertThat(memberCaptor.getValue().getMemberId()).isEqualTo("owner-1");
        assertThat(memberCaptor.getValue().getRole()).isEqualTo(ProjectMemberRole.OWNER);
    }

    @Test
    void createProjectRejectsDuplicateNameForOwner() {
        when(projectRepository.existsByNameAndOwnerId("KBase", "owner-1")).thenReturn(true);

        assertThatThrownBy(() -> projectService.createProject("KBase", "Docs"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("already exists");

        verify(projectRepository, never()).save(any(Project.class));
    }

    @Test
    void createProjectRejectsDescriptionsLongerThanOneHundredWords() {
        String description = String.join(" ", java.util.Collections.nCopies(101, "word"));
        when(projectRepository.existsByNameAndOwnerId("KBase", "owner-1")).thenReturn(false);

        assertThatThrownBy(() -> projectService.createProject("KBase", description))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("must not exceed 100 words");
    }

    @Test
    void addMemberValidatesUserAndSavesMembership() {
        Project project = Project.builder().id(2L).ownerId("owner-1").name("KBase").build();
        when(projectRepository.findById(2L)).thenReturn(Optional.of(project));
        when(authServiceWrapper.getInternalUser("member-2"))
                .thenReturn(new UserInternalDTO("member-2", "member@example.com", "Member Two"));
        when(projectMemberRepository.existsByProject_IdAndMemberId(2L, "member-2")).thenReturn(false);

        projectService.addMember(2L, "member-2", ProjectMemberRole.EDITOR);

        ArgumentCaptor<ProjectMember> captor = ArgumentCaptor.forClass(ProjectMember.class);
        verify(projectMemberRepository).save(captor.capture());
        assertThat(captor.getValue().getMemberId()).isEqualTo("member-2");
        assertThat(captor.getValue().getRole()).isEqualTo(ProjectMemberRole.EDITOR);
        verify(activityLogService).logActivityEvent(any());
    }

    @Test
    void addMemberRejectsOwnerAsMember() {
        Project project = Project.builder().id(2L).ownerId("owner-1").name("KBase").build();
        when(projectRepository.findById(2L)).thenReturn(Optional.of(project));
        when(authServiceWrapper.getInternalUser("owner-1"))
                .thenReturn(new UserInternalDTO("owner-1", "owner@example.com", "Owner One"));

        assertThatThrownBy(() -> projectService.addMember(2L, "owner-1", ProjectMemberRole.VIEWER))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void getProjectMembersUsesFallbackWhenAuthServiceDoesNotReturnUser() {
        Project project = Project.builder().id(2L).ownerId("owner-1").name("KBase").build();
        ProjectMember member = ProjectMember.builder()
                .memberId("member-2")
                .role(ProjectMemberRole.VIEWER)
                .createdAt(LocalDateTime.now())
                .project(project)
                .build();
        when(projectRepository.findById(2L)).thenReturn(Optional.of(project));
        when(projectMemberRepository.findByProject_Id(2L)).thenReturn(List.of(member));
        when(authServiceWrapper.getInternalUser("member-2")).thenReturn(null);

        List<ProjectMemberDto> members = projectService.getProjectMembers(2L);

        assertThat(members).hasSize(1);
        assertThat(members.get(0).getEmail()).isEqualTo("Unknown Email");
        assertThat(members.get(0).getFullName()).isEqualTo("Unknown User");
    }

    @Test
    void updateMemberRoleRejectsOwnerAndOwnerPromotion() {
        ProjectMember owner = ProjectMember.builder().memberId("owner-1").role(ProjectMemberRole.OWNER).build();
        when(projectMemberRepository.findByProject_IdAndMemberId(2L, "owner-1"))
                .thenReturn(Optional.of(owner));

        assertThatThrownBy(() -> projectService.updateMemberRole(2L, "owner-1", ProjectMemberRole.EDITOR))
                .isInstanceOf(IllegalArgumentException.class);

        ProjectMember viewer = ProjectMember.builder().memberId("member-2").role(ProjectMemberRole.VIEWER).build();
        when(projectMemberRepository.findByProject_IdAndMemberId(2L, "member-2"))
                .thenReturn(Optional.of(viewer));

        assertThatThrownBy(() -> projectService.updateMemberRole(2L, "member-2", ProjectMemberRole.OWNER))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void transferOwnershipUpdatesProjectAndRoles() {
        Project project = Project.builder().id(2L).ownerId("owner-1").name("KBase").build();
        ProjectMember oldOwner = ProjectMember.builder().memberId("owner-1").role(ProjectMemberRole.OWNER).build();
        ProjectMember newOwner = ProjectMember.builder().memberId("member-2").role(ProjectMemberRole.EDITOR).build();
        when(projectRepository.findById(2L)).thenReturn(Optional.of(project));
        when(projectMemberRepository.findByProject_IdAndMemberId(2L, "member-2"))
                .thenReturn(Optional.of(newOwner));
        when(projectMemberRepository.findByProject_IdAndMemberId(2L, "owner-1"))
                .thenReturn(Optional.of(oldOwner));

        projectService.transferOwnership(2L, "member-2");

        assertThat(project.getOwnerId()).isEqualTo("member-2");
        assertThat(oldOwner.getRole()).isEqualTo(ProjectMemberRole.EDITOR);
        assertThat(newOwner.getRole()).isEqualTo(ProjectMemberRole.OWNER);
        verify(projectRepository).save(project);
        verify(projectMemberRepository).save(oldOwner);
        verify(projectMemberRepository).save(newOwner);
    }

    @Test
    void deleteProjectCleansRelatedResources() {
        Project project = Project.builder().id(2L).ownerId("owner-1").name("KBase").build();
        when(projectRepository.findById(2L)).thenReturn(Optional.of(project));

        projectService.deleteProject(2L);

        verify(storageServiceWrapper).deleteAllDocumentsByProject(2L);
        verify(projectInvitationRepository).deleteByProject_Id(2L);
        verify(activityRepository).deleteByProjectId(2L);
        verify(projectRepository).delete(project);
    }

    @Test
    void updateStorageLimitAsAdminRejectsInvalidLimitAndUpdatesValidLimit() {
        assertThatThrownBy(() -> projectService.updateStorageLimitAsAdmin(2L, 0L))
                .isInstanceOf(IllegalArgumentException.class);

        Project project = Project.builder().id(2L).ownerId("owner-1").name("KBase").storageLimit(100L).build();
        when(projectRepository.findById(2L)).thenReturn(Optional.of(project));
        when(projectRepository.save(project)).thenReturn(project);

        ProjectDto dto = projectService.updateStorageLimitAsAdmin(2L, 2048L);

        assertThat(dto.getStorageLimit()).isEqualTo(2048L);
    }

    @Test
    void getMissingProjectThrowsResourceNotFound() {
        when(projectRepository.findById(404L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> projectService.getProject(404L))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
