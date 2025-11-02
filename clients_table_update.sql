In HTML, <form> cannot be a descendant of <form>.
This will cause a hydration error.

  ...
    <ProtectedRoute>
      <PageTransitionWrapper>
        <PageTransitionProvider>
          <Layout>
            <div className="relative f...">
              <div>
              <aside>
              <main className="flex-1 p-4..." style={{...}}>
                <Outlet>
                  <RenderedRoute match={{params:{}, ...}} routeContext={{outlet:null, ...}}>
                    <ServiceRegistryPage>
                      <div className="min-h-scre...">
                        <header>
                        <main className="flex-1 w-f...">
                          <div className="max-w-2xl ...">
>                           <form onSubmit={function handleSubmit}>
                              ...
                                <SaveClientModal isOpen={true} onClose={function onClose} clientName="LUVA DE PE..." ...>
                                  <div className="fixed inse..." onClick={function handleCancel}>
                                    <div className="bg-white d..." onClick={function onClick}>
                                      <div>
>                                     <form onSubmit={function handleSubmit} className="px-6 py-5">
                              ...
                        ...

validateDOMNesting @ react-dom_client.js?v=5bd61b87:2156Understand this error
react-dom_client.js?v=5bd61b87:2163 <form> cannot contain a nested <form>.
See this log for the ancestor stack trace