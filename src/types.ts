export interface SegmentEvent<Props = any> {
  type: 'track'
  name: string
  properties: Props
}
