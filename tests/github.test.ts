import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildGitHubSearchUrl,
  loadSavedAssets,
  saveAssets,
  searchGitHubRepositories,
  toExternalAsset,
  type GitHubRepository,
} from '../src/github.ts'

const repository: GitHubRepository = {
  id: 42,
  name: 'agent-kit',
  full_name: 'octocat/agent-kit',
  html_url: 'https://github.com/octocat/agent-kit',
  description: 'An AI agent toolkit',
  stargazers_count: 1234,
  owner: { login: 'octocat' },
  topics: ['ai-agent', 'typescript'],
  license: { spdx_id: 'MIT' },
  pushed_at: '2026-08-20T12:34:56Z',
}

test('trending 검색은 최근 30일에 생성된 저장소를 STAR 순으로 요청한다', () => {
  const url = new URL(buildGitHubSearchUrl('AI agent', 'trending', new Date('2026-08-21T00:00:00Z')))

  assert.equal(
    url.searchParams.get('q'),
    'AI agent in:name,description archived:false fork:false created:>=2026-07-22',
  )
  assert.equal(url.searchParams.get('sort'), 'stars')
  assert.equal(url.searchParams.get('order'), 'desc')
  assert.equal(url.searchParams.get('per_page'), '10')
})

test('STAR 검색은 업데이트 날짜 제한 없이 요청한다', () => {
  const url = new URL(buildGitHubSearchUrl('MCP', 'stars', new Date('2026-08-21T00:00:00Z')))

  assert.equal(url.searchParams.get('q'), 'MCP in:name,description archived:false fork:false')
})

test('GitHub 저장소를 설치 명령이 없는 외부 자산으로 변환한다', () => {
  assert.deepEqual(toExternalAsset(repository, 'plugin', '2026-08-21'), {
    id: 'github-42',
    kind: 'plugin',
    source: 'external',
    name: 'agent-kit',
    description: 'An AI agent toolkit',
    owner: 'octocat',
    url: 'https://github.com/octocat/agent-kit',
    tags: ['ai-agent', 'typescript'],
    license: 'MIT',
    status: 'stable',
    registered: '2026-08-21',
    updated: '2026-08-20',
  })
})

test('설명이 없고 topic이 없는 저장소에도 표시 가능한 기본값을 채운다', () => {
  assert.deepEqual(
    toExternalAsset(
      { ...repository, description: null, topics: [], license: null },
      'etc',
      '2026-08-21',
    ),
    {
      id: 'github-42',
      kind: 'etc',
      source: 'external',
      name: 'agent-kit',
      description: 'GitHub에서 주목받는 공개 저장소입니다.',
      owner: 'octocat',
      url: 'https://github.com/octocat/agent-kit',
      tags: ['github'],
      status: 'stable',
      registered: '2026-08-21',
      updated: '2026-08-20',
    },
  )
})

test('이름 정규화가 같은 서로 다른 GitHub 저장소에도 고유 ID를 부여한다', () => {
  const first = toExternalAsset(
    { ...repository, id: 41, full_name: 'octocat/agent_kit' },
    'skill',
    '2026-08-21',
  )
  const second = toExternalAsset(
    { ...repository, id: 42, full_name: 'octocat/agent-kit' },
    'skill',
    '2026-08-21',
  )

  assert.notEqual(first.id, second.id)
})

test('선택한 외부 자산을 저장하고 다시 복원한다', () => {
  const values = new Map<string, string>()
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  }
  const asset = toExternalAsset(repository, 'skill', '2026-08-21')

  saveAssets(storage, [asset])

  assert.deepEqual(loadSavedAssets(storage), [asset])
})

test('등록일이 없는 기존 저장 자산은 수정일을 등록일로 사용해 복원한다', () => {
  const { registered: _registered, ...legacyAsset } = toExternalAsset(
    repository,
    'skill',
    '2026-08-21',
  )
  const storage = {
    getItem: () => JSON.stringify([legacyAsset]),
    setItem: () => undefined,
  }

  assert.deepEqual(loadSavedAssets(storage), [{ ...legacyAsset, registered: '2026-08-20' }])
})

test('손상된 저장 데이터는 빈 목록으로 복구한다', () => {
  const storage = {
    getItem: () => '{broken json',
    setItem: () => undefined,
  }

  assert.deepEqual(loadSavedAssets(storage), [])
})

test('필수 자산 필드가 빠진 저장 데이터는 복원하지 않는다', () => {
  const storage = {
    getItem: () =>
      JSON.stringify([
        {
          id: 'github-broken-entry',
          source: 'external',
          name: 'broken-entry',
          url: 'https://github.com/octocat/broken-entry',
          tags: [],
        },
      ]),
    setItem: () => undefined,
  }

  assert.deepEqual(loadSavedAssets(storage), [])
})

test('highlights 타입이 손상된 저장 데이터는 복원하지 않는다', () => {
  const asset = toExternalAsset(repository, 'skill', '2026-08-21')
  const storage = {
    getItem: () => JSON.stringify([{ ...asset, highlights: 'agent' }]),
    setItem: () => undefined,
  }

  assert.deepEqual(loadSavedAssets(storage), [])
})

test('GitHub 요청 한도 오류를 사용자에게 설명한다', async () => {
  const request = async () =>
    new Response('{"message":"API rate limit exceeded"}', {
      status: 403,
      headers: { 'x-ratelimit-reset': '1787270400' },
    })

  await assert.rejects(
    searchGitHubRepositories('AI agent', 'trending', undefined, request),
    /GitHub 조회 한도를 초과했습니다/,
  )
})
