const Queries = {
  DEPENDENCIES: () => `
      dependencies
        | where timestamp > ago(3d)
        | project cloud_RoleName, type, target
        | where cloud_RoleName != "" and type <> "InProc" and type <> 'Ajax'
        | distinct cloud_RoleName, target, type
`,
}

export default Queries
