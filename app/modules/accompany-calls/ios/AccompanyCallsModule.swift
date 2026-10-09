import ExpoModulesCore
import CallKit

public class AccompanyCallsModule: Module {
  private let provider: CXProvider
  private let controller = CXCallController()

  public required init(appContext: AppContext) {
    let configuration = CXProviderConfiguration()
    configuration.supportsVideo = true
    configuration.maximumCallsPerCallGroup = 1
    configuration.supportedHandleTypes = [.generic]
    provider = CXProvider(configuration: configuration)
    super.init(appContext: appContext)
    provider.setDelegate(self, queue: nil)
  }

  public func definition() -> ModuleDefinition {
    Name("AccompanyCalls")
    Events("onCallAction")

    Function("showIncoming") { (callId: String, name: String, video: Bool) in
      self.report(callId: callId, name: name, video: video, incoming: true)
    }
    Function("showOutgoing") { (callId: String, name: String, video: Bool) in
      self.start(callId: callId, name: name, video: video)
    }
    Function("showConnected") { (callId: String, name: String, video: Bool) in
      guard let uuid = UUID(uuidString: callId) else { return }
      self.provider.reportOutgoingCall(with: uuid, connectedAt: Date())
    }
    Function("dismiss") { (callId: String) in
      guard let uuid = UUID(uuidString: callId) else { return }
      self.provider.reportCall(with: uuid, endedAt: Date(), reason: .remoteEnded)
    }
  }

  private func report(callId: String, name: String, video: Bool, incoming: Bool) {
    guard let uuid = UUID(uuidString: callId) else { return }
    let update = CXCallUpdate()
    update.remoteHandle = CXHandle(type: .generic, value: name)
    update.hasVideo = video
    update.localizedCallerName = name
    if incoming {
      provider.reportNewIncomingCall(with: uuid, update: update) { _ in }
    }
  }

  private func start(callId: String, name: String, video: Bool) {
    guard let uuid = UUID(uuidString: callId) else { return }
    let handle = CXHandle(type: .generic, value: name)
    let action = CXStartCallAction(call: uuid, handle: handle)
    action.isVideo = video
    controller.request(CXTransaction(action: action)) { _ in }
  }
}

extension AccompanyCallsModule: CXProviderDelegate {
  public func providerDidReset(_ provider: CXProvider) {}

  public func provider(_ provider: CXProvider, perform action: CXAnswerCallAction) {
    sendEvent("onCallAction", ["action": "answer", "callId": action.callUUID.uuidString.lowercased()])
    action.fulfill()
  }

  public func provider(_ provider: CXProvider, perform action: CXEndCallAction) {
    sendEvent("onCallAction", ["action": "hangup", "callId": action.callUUID.uuidString.lowercased()])
    action.fulfill()
  }

  public func provider(_ provider: CXProvider, perform action: CXSetMutedCallAction) {
    action.fulfill()
  }
}
