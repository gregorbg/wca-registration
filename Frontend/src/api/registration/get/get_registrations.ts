import createClient from 'openapi-fetch'
import { getJWT } from '../../auth/get_jwt'
import backendFetch, { BackendError } from '../../helper/backend_fetch'
import { EXPIRED_TOKEN } from '../../helper/error_codes'
import { components, paths } from '../../schema'
import { getCompetitorsInfo } from '../../user/get/get_user_info'

const { GET } = createClient<paths>({
  // TODO: Change this once we are fully migrated from backend fetch
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  baseUrl: process.env.API_URL.slice(0, -7),
})

export async function getConfirmedRegistrations(
  competitionID: string
): Promise<components['schemas']['registration'][]> {
  //TODO: Because there is currently no bulk user fetch route we need to manually add user data here
  const { data, response } = await GET(
    '/api/v1/registrations/{competition_id}',
    {
      params: { path: { competition_id: competitionID } },
    }
  )
  if (!response.ok) {
    throw new BackendError(500, response.status)
  }
  if (data!.length > 0) {
    const userInfos = await getCompetitorsInfo(data!.map((d) => d.user_id))
    return data!.map((registration) => ({
      ...registration,
      user: userInfos.users.find(
        (user) => user.id === Number(registration.user_id)
      ),
    }))
  }
  return []
}

export async function getAllRegistrations(
  competitionID: string
): Promise<components['schemas']['registrationAdmin'][]> {
  //TODO: Because there is currently no bulk user fetch route we need to manually add user data here
  const { data, error, response } = await GET(
    '/api/v1/registrations/{competition_id}/admin',
    {
      params: { path: { competition_id: competitionID } },
      headers: { Authorization: await getJWT() },
    }
  )
  if (error) {
    if (error.error === EXPIRED_TOKEN) {
      await getJWT(true)
      return getAllRegistrations(competitionID)
    }
    throw new BackendError(error.error, response.status)
  }
  const userInfos = await getCompetitorsInfo(data!.map((d) => d.user_id))
  return data!.map((registration) => ({
    ...registration,
    user: userInfos.users.find(
      (user) => user.id === Number(registration.user_id)
    ),
  }))
}

export async function getSingleRegistration(
  userId: string,
  competitionId: string
): Promise<{ registration: components['schemas']['registrationAdmin'] }> {
  return backendFetch(
    `/register?user_id=${userId}&competition_id=${competitionId}`,
    'GET',
    { needsAuthentication: true }
  ) as Promise<{ registration: components['schemas']['registrationAdmin'] }>
}
