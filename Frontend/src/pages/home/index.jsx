import { UiIcon } from '@thewca/wca-components'
import { marked } from 'marked'
import moment from 'moment'
import React, { useContext } from 'react'
import { Container, Grid, Header, Segment } from 'semantic-ui-react'
import { CompetitionContext } from '../../api/helper/context/competition_context'
import RegistrationRequirements from '../register/components/RegistrationRequirements'
import styles from './index.module.scss'

export default function HomePage() {
  const { competitionInfo } = useContext(CompetitionContext)
  return (
    <Container>
      <div>
        <RegistrationRequirements />
      </div>
      {competitionInfo.information && (
        <div>
          <Header as="h3">Information:</Header>
          <div
            className={styles.information}
            dangerouslySetInnerHTML={{
              __html: marked(competitionInfo.information),
            }}
          />
        </div>
      )}
      <Header as="h3">
        Registration Period:
        <Header.Subheader>
          {new Date(competitionInfo.registration_open) < new Date()
            ? `Registration opened ${moment(
                competitionInfo.registration_open
              ).calendar()} and will close ${moment(
                competitionInfo.registration_close
              ).format('ll')}`
            : `Registration will open ${moment(
                competitionInfo.registration_open
              ).calendar()}`}
        </Header.Subheader>
      </Header>
      <Segment padded attached>
        <Grid>
          <Grid.Column width={3}>
            <Header className={styles.informationHeader}>Date</Header>
            <Header className={styles.informationHeader}>City</Header>
            <Header className={styles.informationHeader}>Venue</Header>
            <Header className={styles.informationHeader} color="grey">
              Address
            </Header>
            {competitionInfo.venue_details && (
              <Header className={styles.informationHeader} color="grey">
                Details
              </Header>
            )}
            <Header className={styles.informationHeader}>
              Competitor Limit
            </Header>
            <Header className={styles.informationHeader}>Contact</Header>
            <Header className={styles.informationHeader}>Organizers</Header>
            <Header className={styles.informationHeader}>Delegates</Header>
          </Grid.Column>
          <Grid.Column width={12}>
            <Header className={styles.informationHeader}>
              {competitionInfo.start_date === competitionInfo.end_date
                ? `${moment(competitionInfo.start_date).format('ll')}`
                : `${moment(competitionInfo.start_date).format(
                    'll'
                  )} to ${moment(competitionInfo.end_date).format('ll')}`}
            </Header>
            <Header className={styles.informationHeader}>
              {competitionInfo.city}, {competitionInfo.country_iso2}
            </Header>
            <Header className={styles.informationHeader}>
              <p
                dangerouslySetInnerHTML={{
                  __html: marked(competitionInfo.venue),
                }}
              />
            </Header>
            <Header className={styles.informationHeader} color="grey">
              {competitionInfo.venue_address}
            </Header>
            {competitionInfo.venue_details && (
              <Header className={styles.informationHeader} color="grey">
                {competitionInfo.venue_details}
              </Header>
            )}
            <Header className={styles.informationHeader}>
              {competitionInfo.competitor_limit}
            </Header>
            <Header className={styles.informationHeader}>
              {competitionInfo.contact ? (
                <span
                  dangerouslySetInnerHTML={{
                    __html: marked(competitionInfo.contact),
                  }}
                />
              ) : (
                <a
                  href={`https://www.worldcubeassociation.org/contact/website?competitionId=${competitionInfo.id}`}
                >
                  Organization Team
                </a>
              )}
            </Header>
            <Header className={styles.informationHeader}>
              {competitionInfo.organizers.map((organizer, index) => (
                <a
                  key={`competition-organizer-${organizer.id}`}
                  href={`${process.env.WCA_URL}/persons/${organizer.wca_id}`}
                >
                  {organizer.name}
                  {index !== competitionInfo.organizers.length - 1 ? ', ' : ''}
                </a>
              ))}
            </Header>
            <Header className={styles.informationHeader}>
              {competitionInfo.delegates.map((delegate, index) => (
                <a
                  key={`competition-organizer-${delegate.id}`}
                  href={`${process.env.WCA_URL}/persons/${delegate.wca_id}`}
                >
                  {delegate.name}
                  {index !== competitionInfo.delegates.length - 1 ? ', ' : ''}
                </a>
              ))}
            </Header>
          </Grid.Column>
        </Grid>
        <Header className={styles.informationHeader}>
          <UiIcon name="print" />
          <Header.Content>
            Download all of the competitions details as a PDF{' '}
            <a
              href={`https://www.worldcubeassociation.org/competitions/${competitionInfo.id}.pdf`}
            >
              here
            </a>
          </Header.Content>
        </Header>
      </Segment>
      <Header attached="bottom" textAlign="center" as="h2">
        The Competition has been bookmarked{' '}
        {competitionInfo.number_of_bookmarks} times
      </Header>
    </Container>
  )
}
