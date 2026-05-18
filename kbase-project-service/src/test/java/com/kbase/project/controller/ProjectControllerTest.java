package com.kbase.project.controller;

import com.kbase.project.dto.AddProjectMemberRequest;
import com.kbase.project.dto.CreateProjectRequest;
import com.kbase.project.dto.ProjectDto;
import com.kbase.project.dto.ProjectMemberDto;
import com.kbase.project.dto.UpdateProjectMemberRoleRequest;
import com.kbase.project.dto.UpdateProjectRequest;
import com.kbase.project.security.ProjectMemberRole;
import com.kbase.project.service.ProjectService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProjectControllerTest {

    @Mock
    private ProjectService projectService;

    @InjectMocks
    private ProjectController projectController;

    @Test
    void projectCrudEndpointsDelegateToService() {
        ProjectDto project = ProjectDto.builder().id(1L).name("KBase").build();
        CreateProjectRequest create = CreateProjectRequest.builder().name("KBase").description("Docs").build();
        UpdateProjectRequest update = new UpdateProjectRequest();
        update.setName("New");
        update.setDescription("Updated");
        when(projectService.createProject("KBase", "Docs")).thenReturn(project);
        when(projectService.getProject(1L)).thenReturn(project);
        when(projectService.getAllMyProjects()).thenReturn(List.of(project));
        when(projectService.getProjectsByOwner("owner-1")).thenReturn(List.of(project));
        when(projectService.updateProject(1L, "New", "Updated")).thenReturn(project);

        assertThat(projectController.createProject(create).getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(projectController.getProject(1L).getBody().getData()).isSameAs(project);
        assertThat(projectController.getAllProjects().getBody().getData()).containsExactly(project);
        assertThat(projectController.getProjectsByOwner("owner-1").getBody().getData()).containsExactly(project);
        assertThat(projectController.updateProject(1L, update).getBody().getData()).isSameAs(project);

        projectController.deleteProject(1L);
        verify(projectService).deleteProject(1L);
    }

    @Test
    void memberEndpointsDelegateToService() {
        AddProjectMemberRequest add = AddProjectMemberRequest.builder()
                .memberId("member-1")
                .role(ProjectMemberRole.EDITOR)
                .build();
        UpdateProjectMemberRoleRequest updateRole = new UpdateProjectMemberRoleRequest();
        updateRole.setRole(ProjectMemberRole.VIEWER);
        ProjectMemberDto member = ProjectMemberDto.builder().memberId("member-1").role(ProjectMemberRole.EDITOR).build();
        when(projectService.getProjectMembers(1L)).thenReturn(List.of(member));

        assertThat(projectController.addProjectMember(1L, add).getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(projectController.getProjectMembers(1L).getBody().getData()).containsExactly(member);
        assertThat(projectController.updateProjectMemberRole(1L, "member-1", updateRole).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(projectController.removeProjectMember(1L, "member-1").getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(projectController.transferOwnership(1L, "member-1").getStatusCode()).isEqualTo(HttpStatus.OK);
    }
}
