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
  MessagingConfig: () => `
        let sqs_data = dependencies
        | where type == "Queue Message | aws_sqs"
        | summarize outbound_sqs_queues = strcat_array(make_set(target), ",") by cloud_RoleName;

        let sns_data = dependencies
        | where type == "Queue Message | aws.sns"
        | summarize outbound_sns_topics = strcat_array(make_set(target), ",") by cloud_RoleName;

        let source_data = requests
        | where isnotempty(source)
        | where isempty(url)
        | where source <> "(temporary)"
        | summarize inbound_sqs_queues = strcat_array(make_set(source), ",") by cloud_RoleName;

        let role_names = union isfuzzy=true
            (sqs_data | project cloud_RoleName),
            (sns_data | project cloud_RoleName),
            (source_data | project cloud_RoleName)
        | summarize by cloud_RoleName;

        role_names
        | join kind=leftouter sqs_data on cloud_RoleName
        | join kind=leftouter sns_data on cloud_RoleName
        | join kind=leftouter source_data on cloud_RoleName
        | project
            cloud_RoleName,
            inbound_sqs_queues = iif(isnull(inbound_sqs_queues), "", inbound_sqs_queues),
            outbound_sns_topics = iif(isnull(outbound_sns_topics), "", outbound_sns_topics),
            outbound_sqs_queues = iif(isnull(outbound_sqs_queues), "", outbound_sqs_queues)
`,
}

export default Queries
