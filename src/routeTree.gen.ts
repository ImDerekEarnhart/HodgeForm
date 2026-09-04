/* eslint-disable */
// @ts-nocheck
// Generated route tree. TanStack Router overwrites this during dev/build.
import { Route as rootRouteImport } from './routes/__root'
import { Route as IndexRouteImport } from './routes/index'
import { Route as OverviewRouteImport } from './routes/overview'
import { Route as VerifyRouteImport } from './routes/verify'
import { Route as GatesRouteImport } from './routes/gates'
import { Route as RepositoriesRouteImport } from './routes/repositories'
import { Route as DiscoveriesRouteImport } from './routes/discoveries'
import { Route as ReceiptsRouteImport } from './routes/receipts'
import { Route as WorkspaceRouteImport } from './routes/workspace'
import { Route as LoginRouteImport } from './routes/login'
import { Route as ResetPasswordRouteImport } from './routes/reset-password'
import { Route as AcceptInviteRouteImport } from './routes/accept-invite'
import { Route as ApiAuthSplatRouteImport } from './routes/api/auth/$'
import { Route as ApiHealthRouteImport } from './routes/api/health'
import { Route as ApiV1RepositoriesRouteImport } from './routes/api/v1/repositories'
import { Route as ApiV1CandidatesRouteImport } from './routes/api/v1/candidates'
import { Route as ApiV1CandidateRouteImport } from './routes/api/v1/candidates/$id'
import { Route as ApiV1CandidateEvidenceRouteImport } from './routes/api/v1/candidates/$id/evidence'
import { Route as ApiV1CandidateReceiptRouteImport } from './routes/api/v1/candidates/$id/receipt'
const IndexRoute = IndexRouteImport.update({ id: '/', path: '/', getParentRoute: () => rootRouteImport } as any)
const OverviewRoute = OverviewRouteImport.update({ id: '/overview', path: '/overview', getParentRoute: () => rootRouteImport } as any)
const VerifyRoute = VerifyRouteImport.update({ id: '/verify', path: '/verify', getParentRoute: () => rootRouteImport } as any)
const GatesRoute = GatesRouteImport.update({ id: '/gates', path: '/gates', getParentRoute: () => rootRouteImport } as any)
const RepositoriesRoute = RepositoriesRouteImport.update({ id: '/repositories', path: '/repositories', getParentRoute: () => rootRouteImport } as any)
const DiscoveriesRoute = DiscoveriesRouteImport.update({ id: '/discoveries', path: '/discoveries', getParentRoute: () => rootRouteImport } as any)
const ReceiptsRoute = ReceiptsRouteImport.update({ id: '/receipts', path: '/receipts', getParentRoute: () => rootRouteImport } as any)
const WorkspaceRoute = WorkspaceRouteImport.update({ id: '/workspace', path: '/workspace', getParentRoute: () => rootRouteImport } as any)
const LoginRoute = LoginRouteImport.update({ id: '/login', path: '/login', getParentRoute: () => rootRouteImport } as any)
const ResetPasswordRoute = ResetPasswordRouteImport.update({ id: '/reset-password', path: '/reset-password', getParentRoute: () => rootRouteImport } as any)
const AcceptInviteRoute = AcceptInviteRouteImport.update({ id: '/accept-invite', path: '/accept-invite', getParentRoute: () => rootRouteImport } as any)
const ApiAuthSplatRoute = ApiAuthSplatRouteImport.update({ id: '/api/auth/$', path: '/api/auth/$', getParentRoute: () => rootRouteImport } as any)
const ApiHealthRoute = ApiHealthRouteImport.update({ id: '/api/health', path: '/api/health', getParentRoute: () => rootRouteImport } as any)
const ApiV1RepositoriesRoute = ApiV1RepositoriesRouteImport.update({ id: '/api/v1/repositories', path: '/api/v1/repositories', getParentRoute: () => rootRouteImport } as any)
const ApiV1CandidatesRoute = ApiV1CandidatesRouteImport.update({ id: '/api/v1/candidates', path: '/api/v1/candidates', getParentRoute: () => rootRouteImport } as any)
const ApiV1CandidateRoute = ApiV1CandidateRouteImport.update({ id: '/api/v1/candidates/$id', path: '/api/v1/candidates/$id', getParentRoute: () => rootRouteImport } as any)
const ApiV1CandidateEvidenceRoute = ApiV1CandidateEvidenceRouteImport.update({ id: '/api/v1/candidates/$id/evidence', path: '/api/v1/candidates/$id/evidence', getParentRoute: () => rootRouteImport } as any)
const ApiV1CandidateReceiptRoute = ApiV1CandidateReceiptRouteImport.update({ id: '/api/v1/candidates/$id/receipt', path: '/api/v1/candidates/$id/receipt', getParentRoute: () => rootRouteImport } as any)
export interface FileRoutesByFullPath { '/': typeof IndexRoute; '/overview': typeof OverviewRoute; '/verify': typeof VerifyRoute; '/gates': typeof GatesRoute; '/repositories': typeof RepositoriesRoute; '/discoveries': typeof DiscoveriesRoute; '/receipts': typeof ReceiptsRoute; '/workspace': typeof WorkspaceRoute; '/login': typeof LoginRoute; '/reset-password': typeof ResetPasswordRoute; '/accept-invite': typeof AcceptInviteRoute; '/api/auth/$': typeof ApiAuthSplatRoute; '/api/health': typeof ApiHealthRoute; '/api/v1/repositories': typeof ApiV1RepositoriesRoute; '/api/v1/candidates': typeof ApiV1CandidatesRoute; '/api/v1/candidates/$id': typeof ApiV1CandidateRoute; '/api/v1/candidates/$id/evidence': typeof ApiV1CandidateEvidenceRoute; '/api/v1/candidates/$id/receipt': typeof ApiV1CandidateReceiptRoute }
export interface FileRoutesByTo { '/': typeof IndexRoute; '/overview': typeof OverviewRoute; '/verify': typeof VerifyRoute; '/gates': typeof GatesRoute; '/repositories': typeof RepositoriesRoute; '/discoveries': typeof DiscoveriesRoute; '/receipts': typeof ReceiptsRoute; '/workspace': typeof WorkspaceRoute; '/login': typeof LoginRoute; '/reset-password': typeof ResetPasswordRoute; '/accept-invite': typeof AcceptInviteRoute; '/api/auth/$': typeof ApiAuthSplatRoute; '/api/health': typeof ApiHealthRoute; '/api/v1/repositories': typeof ApiV1RepositoriesRoute; '/api/v1/candidates': typeof ApiV1CandidatesRoute; '/api/v1/candidates/$id': typeof ApiV1CandidateRoute; '/api/v1/candidates/$id/evidence': typeof ApiV1CandidateEvidenceRoute; '/api/v1/candidates/$id/receipt': typeof ApiV1CandidateReceiptRoute }
export interface FileRoutesById { __root__: typeof rootRouteImport; '/': typeof IndexRoute; '/overview': typeof OverviewRoute; '/verify': typeof VerifyRoute; '/gates': typeof GatesRoute; '/repositories': typeof RepositoriesRoute; '/discoveries': typeof DiscoveriesRoute; '/receipts': typeof ReceiptsRoute; '/workspace': typeof WorkspaceRoute; '/login': typeof LoginRoute; '/reset-password': typeof ResetPasswordRoute; '/accept-invite': typeof AcceptInviteRoute; '/api/auth/$': typeof ApiAuthSplatRoute; '/api/health': typeof ApiHealthRoute; '/api/v1/repositories': typeof ApiV1RepositoriesRoute; '/api/v1/candidates': typeof ApiV1CandidatesRoute; '/api/v1/candidates/$id': typeof ApiV1CandidateRoute; '/api/v1/candidates/$id/evidence': typeof ApiV1CandidateEvidenceRoute; '/api/v1/candidates/$id/receipt': typeof ApiV1CandidateReceiptRoute }
export interface FileRouteTypes { fileRoutesByFullPath: FileRoutesByFullPath; fullPaths: '/'|'/overview'|'/verify'|'/gates'|'/repositories'|'/discoveries'|'/receipts'|'/workspace'|'/login'|'/reset-password'|'/accept-invite'|'/api/auth/$'|'/api/health'|'/api/v1/repositories'|'/api/v1/candidates'|'/api/v1/candidates/$id'|'/api/v1/candidates/$id/evidence'|'/api/v1/candidates/$id/receipt'; fileRoutesByTo: FileRoutesByTo; to: '/'|'/overview'|'/verify'|'/gates'|'/repositories'|'/discoveries'|'/receipts'|'/workspace'|'/login'|'/reset-password'|'/accept-invite'|'/api/auth/$'|'/api/health'|'/api/v1/repositories'|'/api/v1/candidates'|'/api/v1/candidates/$id'|'/api/v1/candidates/$id/evidence'|'/api/v1/candidates/$id/receipt'; id: '__root__'|'/'|'/overview'|'/verify'|'/gates'|'/repositories'|'/discoveries'|'/receipts'|'/workspace'|'/login'|'/reset-password'|'/accept-invite'|'/api/auth/$'|'/api/health'|'/api/v1/repositories'|'/api/v1/candidates'|'/api/v1/candidates/$id'|'/api/v1/candidates/$id/evidence'|'/api/v1/candidates/$id/receipt'; fileRoutesById: FileRoutesById }
export interface RootRouteChildren { IndexRoute: typeof IndexRoute; OverviewRoute: typeof OverviewRoute; VerifyRoute: typeof VerifyRoute; GatesRoute: typeof GatesRoute; RepositoriesRoute: typeof RepositoriesRoute; DiscoveriesRoute: typeof DiscoveriesRoute; ReceiptsRoute: typeof ReceiptsRoute; WorkspaceRoute: typeof WorkspaceRoute; LoginRoute: typeof LoginRoute; ResetPasswordRoute: typeof ResetPasswordRoute; AcceptInviteRoute: typeof AcceptInviteRoute; ApiAuthSplatRoute: typeof ApiAuthSplatRoute; ApiHealthRoute: typeof ApiHealthRoute; ApiV1RepositoriesRoute: typeof ApiV1RepositoriesRoute; ApiV1CandidatesRoute: typeof ApiV1CandidatesRoute; ApiV1CandidateRoute: typeof ApiV1CandidateRoute; ApiV1CandidateEvidenceRoute: typeof ApiV1CandidateEvidenceRoute; ApiV1CandidateReceiptRoute: typeof ApiV1CandidateReceiptRoute }
declare module '@tanstack/react-router' { interface FileRoutesByPath {
  '/': { id:'/'; path:'/'; fullPath:'/'; preLoaderRoute: typeof IndexRouteImport; parentRoute: typeof rootRouteImport }
  '/overview': { id:'/overview'; path:'/overview'; fullPath:'/overview'; preLoaderRoute: typeof OverviewRouteImport; parentRoute: typeof rootRouteImport }
  '/verify': { id:'/verify'; path:'/verify'; fullPath:'/verify'; preLoaderRoute: typeof VerifyRouteImport; parentRoute: typeof rootRouteImport }
  '/gates': { id:'/gates'; path:'/gates'; fullPath:'/gates'; preLoaderRoute: typeof GatesRouteImport; parentRoute: typeof rootRouteImport }
  '/repositories': { id:'/repositories'; path:'/repositories'; fullPath:'/repositories'; preLoaderRoute: typeof RepositoriesRouteImport; parentRoute: typeof rootRouteImport }
  '/discoveries': { id:'/discoveries'; path:'/discoveries'; fullPath:'/discoveries'; preLoaderRoute: typeof DiscoveriesRouteImport; parentRoute: typeof rootRouteImport }
  '/receipts': { id:'/receipts'; path:'/receipts'; fullPath:'/receipts'; preLoaderRoute: typeof ReceiptsRouteImport; parentRoute: typeof rootRouteImport }
  '/workspace': { id:'/workspace'; path:'/workspace'; fullPath:'/workspace'; preLoaderRoute: typeof WorkspaceRouteImport; parentRoute: typeof rootRouteImport }
  '/login': { id:'/login'; path:'/login'; fullPath:'/login'; preLoaderRoute: typeof LoginRouteImport; parentRoute: typeof rootRouteImport }
  '/reset-password': { id:'/reset-password'; path:'/reset-password'; fullPath:'/reset-password'; preLoaderRoute: typeof ResetPasswordRouteImport; parentRoute: typeof rootRouteImport }
  '/accept-invite': { id:'/accept-invite'; path:'/accept-invite'; fullPath:'/accept-invite'; preLoaderRoute: typeof AcceptInviteRouteImport; parentRoute: typeof rootRouteImport }
  '/api/auth/$': { id:'/api/auth/$'; path:'/api/auth/$'; fullPath:'/api/auth/$'; preLoaderRoute: typeof ApiAuthSplatRouteImport; parentRoute: typeof rootRouteImport }
  '/api/health': { id:'/api/health'; path:'/api/health'; fullPath:'/api/health'; preLoaderRoute: typeof ApiHealthRouteImport; parentRoute: typeof rootRouteImport }
  '/api/v1/repositories': { id:'/api/v1/repositories'; path:'/api/v1/repositories'; fullPath:'/api/v1/repositories'; preLoaderRoute: typeof ApiV1RepositoriesRouteImport; parentRoute: typeof rootRouteImport }
  '/api/v1/candidates': { id:'/api/v1/candidates'; path:'/api/v1/candidates'; fullPath:'/api/v1/candidates'; preLoaderRoute: typeof ApiV1CandidatesRouteImport; parentRoute: typeof rootRouteImport }
  '/api/v1/candidates/$id': { id:'/api/v1/candidates/$id'; path:'/api/v1/candidates/$id'; fullPath:'/api/v1/candidates/$id'; preLoaderRoute: typeof ApiV1CandidateRouteImport; parentRoute: typeof rootRouteImport }
  '/api/v1/candidates/$id/evidence': { id:'/api/v1/candidates/$id/evidence'; path:'/api/v1/candidates/$id/evidence'; fullPath:'/api/v1/candidates/$id/evidence'; preLoaderRoute: typeof ApiV1CandidateEvidenceRouteImport; parentRoute: typeof rootRouteImport }
  '/api/v1/candidates/$id/receipt': { id:'/api/v1/candidates/$id/receipt'; path:'/api/v1/candidates/$id/receipt'; fullPath:'/api/v1/candidates/$id/receipt'; preLoaderRoute: typeof ApiV1CandidateReceiptRouteImport; parentRoute: typeof rootRouteImport }
} }
const rootRouteChildren: RootRouteChildren = { IndexRoute, OverviewRoute, VerifyRoute, GatesRoute, RepositoriesRoute, DiscoveriesRoute, ReceiptsRoute, WorkspaceRoute, LoginRoute, ResetPasswordRoute, AcceptInviteRoute, ApiAuthSplatRoute, ApiHealthRoute, ApiV1RepositoriesRoute, ApiV1CandidatesRoute, ApiV1CandidateRoute, ApiV1CandidateEvidenceRoute, ApiV1CandidateReceiptRoute }
export const routeTree = rootRouteImport._addFileChildren(rootRouteChildren)._addFileTypes<FileRouteTypes>()
import type { getRouter } from './router.tsx'
declare module '@tanstack/react-start' { interface Register { ssr: true; router: Awaited<ReturnType<typeof getRouter>> } }
