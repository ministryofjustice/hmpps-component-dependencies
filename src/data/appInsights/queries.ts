const Queries = {
  DEPENDENCIES: () => `
      let since = ago(3d);
      dependencies
      | where timestamp > since
      | where isnotempty(cloud_RoleName)
      | distinct cloud_RoleName, target, type, id=iff(name startswith "PUBLISH ", id, "")
      | join kind=leftouter (
          requests 
          | where timestamp > since
          | where isnotempty(cloud_RoleName) and name startswith "RECEIVE "
          | distinct id = operation_ParentId, consumer_RoleName = cloud_RoleName, type = "messaging"
          ) on id
      | distinct
          cloud_RoleName=iff(type1 == "messaging", consumer_RoleName, cloud_RoleName),
          target=iff(type1 == "messaging", cloud_RoleName, target),
          type = coalesce(type1, type)
      | where type <> "InProc" and type <> "Ajax"
`,
}

export default Queries
