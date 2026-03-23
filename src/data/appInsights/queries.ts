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
        | summarize sqs = make_set(target) by cloud_RoleName;

        let sns_data = dependencies
        | where type == "Queue Message | aws.sns"
        | summarize sns = make_set(target) by cloud_RoleName;

        let source_data = requests
        | where isnotempty(source)
        | where isempty(url)
        | where source <> "(temporary)"
        | summarize source = make_set(source) by cloud_RoleName;

        union isfuzzy=true
            (sqs_data | project cloud_RoleName, sqs, sns=dynamic([]), source=dynamic([])),
            (sns_data | project cloud_RoleName, sns, sqs=dynamic([]), source=dynamic([])),
            (source_data | project cloud_RoleName, source, sqs=dynamic([]), sns=dynamic([]))
        | summarize source = make_set(source), sns = make_set(sns), sqs = make_set(sqs) by cloud_RoleName
        | extend sqs = iif(isnull(sqs), dynamic([]), sqs)
        | extend sns = iif(isnull(sns), dynamic([]), sns)
        | extend source = iif(isnull(source), dynamic([]), source)
        | project cloud_RoleName, inbound_queue = source, topic_queue = sns, outbound_queue = sqs
`,
}

export default Queries
