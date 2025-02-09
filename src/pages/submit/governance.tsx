import React, { useEffect, useMemo } from 'react'
import Helmet from 'react-helmet'
import { navigate } from 'gatsby-plugin-intl'
import { Button } from 'decentraland-ui/dist/components/Button/Button'
import { Header } from 'decentraland-ui/dist/components/Header/Header'
import { Field } from 'decentraland-ui/dist/components/Field/Field'
import { Container } from 'decentraland-ui/dist/components/Container/Container'
import { Loader } from 'decentraland-ui/dist/components/Loader/Loader'
import { SignIn } from 'decentraland-ui/dist/components/SignIn/SignIn'
import { SelectField } from 'decentraland-ui/dist/components/SelectField/SelectField'
import {
  newProposalGovernanceScheme,
  NewProposalDraft,
} from '../../entities/Proposal/types'
import Paragraph from 'decentraland-gatsby/dist/components/Text/Paragraph'
import MarkdownTextarea from 'decentraland-gatsby/dist/components/Form/MarkdownTextarea'
import useFormatMessage from 'decentraland-gatsby/dist/hooks/useFormatMessage'
import useEditor, { assert, createValidator } from 'decentraland-gatsby/dist/hooks/useEditor'
import ContentLayout, { ContentSection } from '../../components/Layout/ContentLayout'
import { Governance } from '../../api/Governance'
import loader from '../../modules/loader'
import locations from '../../modules/locations'
import Label from 'decentraland-gatsby/dist/components/Form/Label'
import useAuthContext from 'decentraland-gatsby/dist/context/Auth/useAuthContext'
import Head from 'decentraland-gatsby/dist/components/Head/Head'
import MarkdownNotice from '../../components/Form/MarkdownNotice'
import './submit.css'
import useVotingPowerBalance from '../../hooks/useVotingPowerBalance'
import isEthereumAddress from 'validator/lib/isEthereumAddress'
import { useLocation } from '@reach/router'
import useAsyncMemo from 'decentraland-gatsby/dist/hooks/useAsyncMemo'

const SNAPSHOT_SPACE = process.env.GATSBY_SNAPSHOT_SPACE || ''

type GovernanceState = {
  linked_proposal_id: string | null,
  title: string,
  summary: string,
  abstract: string,
  motivation: string,
  specification: string,
  impacts: string,
  implementation_pathways: string,
  conclusion: string,
}

const initialState: GovernanceState = {
  linked_proposal_id: null,
  title: '',
  summary: '',
  abstract: '',
  motivation: '',
  specification: '',
  impacts: '',
  implementation_pathways: '',
  conclusion: ''
}
const schema = newProposalGovernanceScheme.properties
const edit = (state: GovernanceState, props: Partial<GovernanceState>) => {
  return {
    ...state,
    ...props
  }
}
const validate = createValidator<GovernanceState>({
  title: (state) => ({
    title: assert(state.title.length <= schema.title.maxLength, 'error.governance.title_too_large') ||
      undefined
  }),
  summary: (state) => ({
    summary: assert(state.summary.length <= schema.summary.maxLength, 'error.governance.summary_too_large') ||
      undefined
  }),
  abstract: (state) => ({
    abstract: assert(state.abstract.length <= schema.abstract.maxLength, 'error.governance.abstract_too_large') ||
      undefined
  }),
  motivation: (state) => ({
    motivation: assert(state.motivation.length <= schema.motivation.maxLength, 'error.governance.motivation_too_large') ||
      undefined
  }),
  impacts: (state) => ({
    impacts: assert(state.impacts.length <= schema.impacts.maxLength, 'error.governance.impacts_too_large') ||
      undefined
  }),
  implementation_pathways: (state) => ({
    implementation_pathways: assert(state.implementation_pathways.length <= schema.implementation_pathways.maxLength, 'error.governance.implementation_pathways_too_large') ||
      undefined
  }),
  specification: (state) => ({
    specification: assert(state.specification.length <= schema.specification.maxLength, 'error.governance.specification_too_large') ||
      undefined
  }),
  conclusion: (state) => ({
    conclusion: assert(state.conclusion.length <= schema.conclusion.maxLength, 'error.governance.conclusion_too_large') ||
      undefined
  }),
  '*': (state) => ({
    linked_proposal_id: (
      assert(!!state.linked_proposal_id, 'error.governance.linked_proposal_empty')
    ),
    title: (
      assert(state.title.length > 0, 'error.governance.title_empty') ||
      assert(state.title.length >= schema.title.minLength, 'error.governance.title_too_short') ||
      assert(state.title.length <= schema.title.maxLength, 'error.governance.title_too_large')
    ),
    summary: (
      assert(state.summary.length > 0, 'error.governance.summary_empty') ||
      assert(state.summary.length >= schema.summary.minLength, 'error.governance.summary_too_short') ||
      assert(state.summary.length <= schema.summary.maxLength, 'error.governance.summary_too_large')
    ),
    abstract: (
      assert(state.abstract.length > 0, 'error.governance.abstract_empty') ||
      assert(state.abstract.length >= schema.abstract.minLength, 'error.governance.abstract_too_short') ||
      assert(state.abstract.length <= schema.abstract.maxLength, 'error.governance.abstract_too_large')
    ),
    motivation: (
      assert(state.motivation.length > 0, 'error.governance.motivation_empty') ||
      assert(state.motivation.length >= schema.motivation.minLength, 'error.governance.motivation_too_short') ||
      assert(state.motivation.length <= schema.motivation.maxLength, 'error.governance.motivation_too_large')
    ),
    impacts: (
      assert(state.impacts.length > 0, 'error.governance.impacts_empty') ||
      assert(state.impacts.length >= schema.impacts.minLength, 'error.governance.impacts_too_short') ||
      assert(state.impacts.length <= schema.impacts.maxLength, 'error.governance.impacts_too_large')
    ),
    implementation_pathways: (
      assert(state.implementation_pathways.length > 0, 'error.governance.implementation_pathways_empty') ||
      assert(state.implementation_pathways.length >= schema.implementation_pathways.minLength, 'error.governance.implementation_pathways_too_short') ||
      assert(state.implementation_pathways.length <= schema.implementation_pathways.maxLength, 'error.governance.implementation_pathways_too_large')
    ),
    specification: (
      assert(state.specification.length > 0, 'error.governance.specification_empty') ||
      assert(state.specification.length >= schema.specification.minLength, 'error.governance.specification_too_short') ||
      assert(state.specification.length <= schema.specification.maxLength, 'error.governance.specification_too_large')
    ),
    conclusion: (
      assert(state.conclusion.length > 0, 'error.governance.conclusion_empty') ||
      assert(state.conclusion.length >= schema.conclusion.minLength, 'error.governance.conclusion_too_short') ||
      assert(state.conclusion.length <= schema.conclusion.maxLength, 'error.governance.conclusion_too_large')
    )
  })
})

export default function SubmitGovernanceProposal() {
  const l = useFormatMessage()
  const location = useLocation()
  const params = useMemo(() => new URLSearchParams(location.search), [location.search])
  const preselectedLinkedProposalId = params.get('linked_proposal_id')
  const [account, accountState] = useAuthContext()
  const accountBalance = isEthereumAddress(params.get('address') || '') ? params.get('address') : account
  const [votingPower, votingPowerState] = useVotingPowerBalance(accountBalance, SNAPSHOT_SPACE)
  const submissionVpNotMet = useMemo(() => votingPower < Number(process.env.GATSBY_SUBMISSION_THRESHOLD_GOVERNANCE), [votingPower])
  const [state, editor] = useEditor(edit, validate, initialState)
  const [preselectedProposal] = useAsyncMemo(async () => {
    if(!preselectedLinkedProposalId) return undefined
    const proposal = await Governance.get().getProposal(preselectedLinkedProposalId)
    if(!proposal) return undefined
    return [{
      key: proposal.id,
      text: proposal.title,
      value: proposal.id
    }]
  }, [] , { initialValue: undefined })

  useEffect(() => {
    if (!!preselectedLinkedProposalId) {
      Promise.resolve()
        .then(async () => {
          return await Governance.get().getProposal(preselectedLinkedProposalId)
        }).then((linkedProposal) => {
        if (linkedProposal) {
          let configuration = linkedProposal.configuration as NewProposalDraft
          editor.set({
            linked_proposal_id: linkedProposal.id,
            summary: configuration.summary,
            abstract: configuration.abstract,
            motivation: configuration.motivation,
            specification: configuration.specification,
            conclusion: configuration.conclusion })
        }
      }).catch((err) => {
        console.error(err, { ...err })
        editor.error({ '*': err.body?.error || err.message })
      })
    }
  }, [preselectedLinkedProposalId])

  useEffect(() => {
    if (state.validated) {
      Promise.resolve()
        .then(async () => {
          return Governance.get().createProposalGovernance({
            ...state.value,
            linked_proposal_id: state.value.linked_proposal_id!
          })
        })
        .then((proposal) => {
          loader.proposals.set(proposal.id, proposal)
          navigate(locations.proposal(proposal.id, { new: 'true' }), { replace: true })
        })
        .catch((err) => {
          console.error(err, { ...err })
          editor.error({ '*': err.body?.error || err.message })
        })
    }
  }, [state.validated])

  if (accountState.loading) {
    return <Container className="WelcomePage">
      <div>
        <Loader size="huge" active />
      </div>
    </Container>
  }

  if (!account) {
    return <Container>
      <Head
        title={l('page.submit_governance.title') || ''}
        description={l('page.submit_governance.description') || ''}
        image="https://decentraland.org/images/decentraland.png"
      />
      <SignIn isConnecting={accountState.selecting || accountState.loading} onConnect={() => accountState.select()} />
    </Container>
  }

  return <ContentLayout small>
    <Head
      title={l('page.submit_governance.title') || ''}
      description={l('page.submit_governance.description') || ''}
      image="https://decentraland.org/images/decentraland.png"
    />
    <Helmet title={l('page.submit_governance.title') || ''} />

    <ContentSection>
      <Header size="huge">{l('page.submit_governance.title')}</Header>
    </ContentSection>
    <ContentSection className="MarkdownSection--tiny">
      {l.markdown('page.submit_governance.description')}
    </ContentSection>

    <ContentSection>
      <Label>{l('page.submit_governance.linked_proposal_label')}</Label>
      <SelectField
        value={state.value.linked_proposal_id || undefined}
        placeholder={l('page.submit_governance.linked_proposal_placeholder') || undefined}
        onChange={(_, { value }) => editor.set({ linked_proposal_id: String(value) })}
        options={preselectedProposal}
        error={!!state.error.linked_proposal_id}
        message={l.optional(state.error.linked_proposal_id)}
        disabled={true}
        loading={votingPowerState.loading}
      />
    </ContentSection>

    <ContentSection>
      <Label>{l('page.submit_governance.title_label')}</Label>
      <Field
        value={state.value.title}
        placeholder={l('page.submit_governance.title_placeholder')}
        onChange={(_, { value }) => editor.set({ title: value })}
        onBlur={() => editor.set({ title: state.value.title.trim() })}
        error={!!state.error.title}
        message={
          l.optional(state.error.title) + ' ' +
          l('page.submit.character_counter', {
            current: state.value.title.length,
            limit: schema.title.maxLength
          })
        }
        disabled={submissionVpNotMet}
        loading={votingPowerState.loading}
      />
    </ContentSection>

    <ContentSection>
      <Label>
        {l('page.submit_governance.summary_label')}
        <MarkdownNotice />
      </Label>
      <Paragraph tiny secondary className="details">{l('page.submit_governance.summary_detail')}</Paragraph>
      <MarkdownTextarea
        minHeight={175}
        value={state.value.summary}
        placeholder={l('page.submit_governance.summary_placeholder')}
        onChange={(_: any, { value }: any) => editor.set({ summary: value })}
        onBlur={() => editor.set({ summary: state.value.summary.trim() })}
        error={!!state.error.summary}
        message={
          l.optional(state.error.summary) + ' ' +
          l('page.submit.character_counter', {
            current: state.value.summary.length,
            limit: schema.summary.maxLength
          })
        }
        disabled={submissionVpNotMet}
      />
    </ContentSection>

    <ContentSection>
      <Label>
        {l('page.submit_governance.abstract_label')}
        <MarkdownNotice />
      </Label>
      <Paragraph tiny secondary className="details">{l('page.submit_governance.abstract_detail')}</Paragraph>
      <MarkdownTextarea
        minHeight={175}
        value={state.value.abstract}
        placeholder={l('page.submit_governance.abstract_placeholder')}
        onChange={(_: any, { value }: any) => editor.set({ abstract: value })}
        onBlur={() => editor.set({ abstract: state.value.abstract.trim() })}
        error={!!state.error.abstract}
        message={
          l.optional(state.error.abstract) + ' ' +
          l('page.submit.character_counter', {
            current: state.value.abstract.length,
            limit: schema.abstract.maxLength
          })
        }
        disabled={submissionVpNotMet}
      />
    </ContentSection>

    <ContentSection>
      <Label>
        {l('page.submit_governance.motivation_label')}
        <MarkdownNotice />
      </Label>
      <Paragraph tiny secondary className="details">{l('page.submit_governance.motivation_detail')}</Paragraph>
      <MarkdownTextarea
        minHeight={175}
        value={state.value.motivation}
        placeholder={l('page.submit_governance.motivation_placeholder')}
        onChange={(_: any, { value }: any) => editor.set({ motivation: value })}
        onBlur={() => editor.set({ motivation: state.value.motivation.trim() })}
        error={!!state.error.motivation}
        message={
          l.optional(state.error.motivation) + ' ' +
          l('page.submit.character_counter', {
            current: state.value.motivation.length,
            limit: schema.motivation.maxLength
          })
        }
        disabled={submissionVpNotMet}
      />
    </ContentSection>

    <ContentSection>
      <Label>
        {l('page.submit_governance.specification_label')}
        <MarkdownNotice />
      </Label>
      <Paragraph tiny secondary className="details">{l('page.submit_governance.specification_detail')}</Paragraph>
      <MarkdownTextarea
        minHeight={175}
        value={state.value.specification}
        placeholder={l('page.submit_governance.specification_placeholder')}
        onChange={(_: any, { value }: any) => editor.set({ specification: value })}
        onBlur={() => editor.set({ specification: state.value.specification.trim() })}
        error={!!state.error.specification}
        message={
          l.optional(state.error.specification) + ' ' +
          l('page.submit.character_counter', {
            current: state.value.specification.length,
            limit: schema.specification.maxLength
          })
        }
        disabled={submissionVpNotMet}
      />
    </ContentSection>


    <ContentSection>
      <Label>
        {l('page.submit_governance.impacts_label')}
        <MarkdownNotice />
      </Label>
      <Paragraph tiny secondary className="details">{l('page.submit_governance.impacts_detail')}</Paragraph>
      <MarkdownTextarea
        minHeight={175}
        value={state.value.impacts}
        placeholder={l('page.submit_governance.impacts_placeholder')}
        onChange={(_: any, { value }: any) => editor.set({ impacts: value })}
        onBlur={() => editor.set({ impacts: state.value.impacts.trim() })}
        error={!!state.error.impacts}
        message={
          l.optional(state.error.impacts) + ' ' +
          l('page.submit.character_counter', {
            current: state.value.impacts.length,
            limit: schema.impacts.maxLength
          })
        }
        disabled={submissionVpNotMet}
      />
    </ContentSection>

    <ContentSection>
      <Label>
        {l('page.submit_governance.implementation_pathways_label')}
        <MarkdownNotice />
      </Label>
      <Paragraph tiny secondary
                 className="details">{l('page.submit_governance.implementation_pathways_detail')}</Paragraph>
      <MarkdownTextarea
        minHeight={175}
        value={state.value.implementation_pathways}
        placeholder={l('page.submit_governance.implementation_pathways_placeholder')}
        onChange={(_: any, { value }: any) => editor.set({ implementation_pathways: value })}
        onBlur={() => editor.set({ implementation_pathways: state.value.implementation_pathways.trim() })}
        error={!!state.error.implementation_pathways}
        message={
          l.optional(state.error.implementation_pathways) + ' ' +
          l('page.submit.character_counter', {
            current: state.value.implementation_pathways.length,
            limit: schema.implementation_pathways.maxLength
          })
        }
        disabled={submissionVpNotMet}
      />
    </ContentSection>

    <ContentSection>
      <Label>
        {l('page.submit_governance.conclusion_label')}
        <MarkdownNotice />
      </Label>
      <Paragraph tiny secondary className="details">{l('page.submit_governance.conclusion_detail')}</Paragraph>
      <MarkdownTextarea
        minHeight={175}
        value={state.value.conclusion}
        placeholder={l('page.submit_governance.conclusion_placeholder')}
        onChange={(_: any, { value }: any) => editor.set({ conclusion: value })}
        onBlur={() => editor.set({ conclusion: state.value.conclusion.trim() })}
        error={!!state.error.conclusion}
        message={
          l.optional(state.error.conclusion) + ' ' +
          l('page.submit.character_counter', {
            current: state.value.conclusion.length,
            limit: schema.specification.maxLength
          })
        }
        disabled={submissionVpNotMet}
      />
    </ContentSection>


    <ContentSection>
      <Button primary
              disabled={state.validated || submissionVpNotMet}
              loading={state.validated || votingPowerState.loading}
              onClick={() => editor.validate()}>
        {l('page.submit.button_submit')}
      </Button>
    </ContentSection>
    {state.error['*'] && <ContentSection>
      <Paragraph small primary>{l(state.error['*']) || state.error['*']}</Paragraph>
    </ContentSection>}
    {submissionVpNotMet && <ContentSection>
      <Paragraph small primary>{l('error.governance.submission_vp_not_met')}</Paragraph>
    </ContentSection>}
  </ContentLayout>
}
