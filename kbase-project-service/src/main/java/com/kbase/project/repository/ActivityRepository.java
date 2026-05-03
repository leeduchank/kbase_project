package com.kbase.project.repository;

import com.kbase.project.entity.Activity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ActivityRepository extends JpaRepository<Activity, Long> {
    List<Activity> findByProjectIdOrderByCreatedAtDesc(Long projectId);
    List<Activity> findByProjectIdAndActionInOrderByCreatedAtDesc(Long projectId, List<String> actions);
    void deleteByProjectId(Long projectId);
}
