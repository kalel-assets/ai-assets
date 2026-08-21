import assert from 'node:assert/strict'
import test from 'node:test'

import { latestAssetDate, localIsoDate } from '../src/date.ts'

test('등록일이 저장소 수정일보다 늦으면 등록일을 최근 변경일로 사용한다', () => {
  assert.equal(
    latestAssetDate({ registered: '2026-07-21', updated: '2026-04-07' }),
    '2026-07-21',
  )
})

test('저장소 수정일이 등록일보다 늦으면 수정일을 최근 변경일로 사용한다', () => {
  assert.equal(
    latestAssetDate({ registered: '2026-07-21', updated: '2026-08-20' }),
    '2026-08-20',
  )
})

test('등록일과 수정일이 같으면 해당 날짜를 그대로 사용한다', () => {
  assert.equal(
    latestAssetDate({ registered: '2026-07-21', updated: '2026-07-21' }),
    '2026-07-21',
  )
})

test('브라우저의 현지 날짜를 ISO 등록일로 변환한다', () => {
  assert.equal(localIsoDate(new Date(2026, 7, 21, 23, 59, 59)), '2026-08-21')
})
