import root from '../window'

const { localStorage } = root

export const setItem = jest.spyOn(localStorage, 'setItem')
export const getItem = jest.spyOn(localStorage, 'getItem')
