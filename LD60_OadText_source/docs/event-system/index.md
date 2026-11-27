# Event System

The fundamental building blocks of quack-engine's event system are [EventEmitters](/event-system/event-emitter). They can be used to capture input events but also to communicate events inside the application. E.g. in the latter case EventEmitters could be used to mimic Redux's dispatch actions and global store system to create a [tutorial process](/event-system/tutorial-example).

For easier usage we provide functions to consume the emitted events [as Promises](/event-system/promises).
