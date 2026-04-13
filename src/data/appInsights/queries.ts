const Queries = {
  dependenciesQuery: () => `
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
  messagingInfoQuery: () => `
        let since = ago(5d);
        union isfuzzy=true
            (
                dependencies
                | where timestamp > since
                | where type == "Queue Message | aws_sqs"
                | where isnotempty(cloud_RoleName) and isnotempty(target)
                | summarize outbound_sqs_queues = strcat_array(make_set(target), ",") by cloud_RoleName
                | project cloud_RoleName, inbound_sqs_queues = "", outbound_sns_topics = "", outbound_sqs_queues
            ),
            (
                dependencies
                | where timestamp > since
                | where type == "Queue Message | aws.sns"
                | where isnotempty(cloud_RoleName) and isnotempty(target)
                | summarize outbound_sns_topics = strcat_array(make_set(target), ",") by cloud_RoleName
                | project cloud_RoleName, inbound_sqs_queues = "", outbound_sns_topics, outbound_sqs_queues = ""
            ),
            (
                requests
                | where timestamp > since
                | where isnotempty(cloud_RoleName)
                | where isnotempty(source)
                | where isempty(url)
                | where source <> "(temporary)"
                | summarize inbound_sqs_queues = strcat_array(make_set(source), ",") by cloud_RoleName
                | project cloud_RoleName, inbound_sqs_queues, outbound_sns_topics = "", outbound_sqs_queues = ""
            )
        | summarize
            inbound_sqs_queues = max(inbound_sqs_queues),
            outbound_sns_topics = max(outbound_sns_topics),
            outbound_sqs_queues = max(outbound_sqs_queues)
          by cloud_RoleName
        | project
            cloud_RoleName,
            inbound_sqs_queues,
            outbound_sns_topics,
            outbound_sqs_queues
`,
}

export default Queries
