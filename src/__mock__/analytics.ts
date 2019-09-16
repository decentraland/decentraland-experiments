import EventEmitter from 'eventemitter3'

export class Analytics extends EventEmitter
  implements SegmentAnalytics.AnalyticsJS {
  /* Use a plugin */
  use = (..._: any[]) => this

  /* Initialize with the given integration `settings` and `options`. */
  init = (..._: any[]) => this

  /* Define a new integration */
  addIntegration = (..._: any[]) => this

  /*  Set the user's `id`. */
  setAnonymousId = (..._: any[]) => this

  /* Configure Segment with write key */
  load = (..._: any[]) => {}

  /* The identify method is how you tie one of your users and their actions
       to a recognizable userId and traits. */
  identify = (...args: any[]) => {
    this.emit('track', ...args)
  }

  /* The track method lets you record any actions your users perform. */
  track = (...args: any[]) => {
    this.emit('track', ...args)
  }

  /* The page method lets you record page views on your website, along with
       optional extra information about the page being viewed. */
  page = (...args: any[]) => {
    this.emit('page', ...args)
  }

  /* The group method associates an individual user with a group. The group
       can a company, organization, account, project, team or any other name
       you came up with for the same concept. */
  // group(groupId: string, traits?: Object, options?: SegmentOpts,
  //       callback?: () => void): void;
  // group(groupId: string, traits?: Object, callback?: () => void): void;
  // group(): { id(): string; traits(_?: Object): void };
  group = (...args: any[]): any => {
    if (args.length === 0) {
      return {
        id(): string {
          return 'group|123'
        },
        traits(_?: Object): void {}
      }
    } else {
      this.emit('page', ...args)
    }
  }

  /* The alias method combines two previously unassociated user identities.
       This comes in handy if the same user visits from two different devices
       and you want to combine their history.

       Some providers also don’t alias automatically for you when an anonymous
       user signs up (like Mixpanel), so you need to call alias manually right
       after sign up with their brand new userId. */
  // alias(
  //   userId: string,
  //   previousId?: string,
  //   options?: SegmentOpts,
  //   callback?: () => void
  // ): void
  // alias(userId: string, previousId?: string, callback?: () => void): void
  // alias(userId: string, callback?: () => void): void
  // alias(userId: string, options?: SegmentOpts, callback?: () => void): void
  alias = (..._: any[]) => {}

  /* trackLink is a helper that binds a track call to whenever a link is
       clicked. Usually the page would change before you could call track, but
       with trackLink a small timeout is inserted to give the track call enough
       time to fire. */
  trackLink = (..._: any[]) => {}

  /* trackForm is a helper that binds a track call to a form submission.
       Usually the page would change before you could call track, but with
       trackForm a small timeout is inserted to give the track call enough
       time to fire. */
  trackForm = (..._: any[]) => {}

  /* The ready method allows you to pass in a callback that will be called as
       soon as all of your enabled integrations have loaded. It’s like jQuery’s
       ready method, except for integrations. */
  ready = (..._: any[]) => {}

  /* If you need to clear the user and group id and traits we’ve added a
       reset function that is most commonly used when your identified users
       logout of your application. */
  reset = (..._: any[]) => {}

  /* Once Analytics.js loaded, you can retrieve information about the
       currently identified user or group like their id and traits. */
  user(): {
    id(): string
    logout(): void
    reset(): void
    anonymousId(newId?: string): string
    traits(newTraits?: Object): void
  } {
    return {
      id() {
        return 'user|123'
      },
      logout() {},
      reset() {},
      anonymousId(newId?: string) {
        return 'user|' + (newId || '999')
      },
      traits(_?: Object) {}
    }
  }

  /* Analytics.js has a debug mode that logs helpful messages to the
       console. */
  debug = (..._: any[]) => {}

  /* You can extend the length (in milliseconds) of the method callbacks and
       helpers */
  timeout = (..._: any[]) => {}
}

const analytics = new Analytics()

export const track = jest.spyOn(analytics, 'track')
export const on = jest.spyOn(analytics, 'on')
export const off = jest.spyOn(analytics, 'off')

export default analytics
