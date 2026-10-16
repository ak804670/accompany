package expo.modules.accompanycalls

import android.app.PendingIntent
import android.media.Ringtone
import android.media.RingtoneManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.OutcomeReceiver
import android.telecom.CallAudioState
import android.telecom.CallEndpoint
import android.telecom.CallEndpointException
import android.telecom.Connection
import android.telecom.PhoneAccount
import android.telecom.PhoneAccountHandle
import android.telecom.TelecomManager
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AccompanyCallsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AccompanyCalls")
    Events("onCallAction")
    AsyncFunction("requestPrivacyPermissions") {
      mapOf("camera" to false, "microphone" to false, "notifications" to false)
    }
    OnCreate { instance = this@AccompanyCallsModule }
    Function("showIncoming") { callId: String, name: String, video: Boolean ->
      val context = appContext.reactContext ?: return@Function
      CallNotifier.show(context, callId, name, video, incoming = true)
      TelecomBridge.addIncoming(context, callId, video)
    }
    Function("showOutgoing") { callId: String, name: String, video: Boolean ->
      val context = appContext.reactContext ?: return@Function
      CallNotifier.show(context, callId, name, video, incoming = false)
      TelecomBridge.placeOutgoing(context, callId, video)
    }
    Function("showConnected") { callId: String, name: String, video: Boolean ->
      val context = appContext.reactContext ?: return@Function
      CallNotifier.show(context, callId, name, video, incoming = false)
      TelecomBridge.markActive(callId, video)
    }
    Function("setAudioRoute") { callId: String, speakerOn: Boolean ->
      TelecomBridge.setAudioRoute(callId, speakerOn)
    }
    Function("dismiss") { callId: String ->
      val context = appContext.reactContext ?: return@Function
      CallNotifier.dismiss(context, callId)
      TelecomBridge.disconnect(callId)
    }
  }

  companion object {
    var instance: AccompanyCallsModule? = null

    fun emit(action: String, callId: String) {
      instance?.sendEvent("onCallAction", mapOf("action" to action, "callId" to callId))
    }
  }
}

object CallNotifier {
  private const val CHANNEL = "accompany_calls"
  private var ringtone: Ringtone? = null

  fun show(context: Context, callId: String, name: String, video: Boolean, incoming: Boolean) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    stopRingtone()
    val intent = Intent(context, CallForegroundService::class.java).apply {
      putExtra("callId", callId)
      putExtra("name", name)
      putExtra("video", video)
      putExtra("incoming", incoming)
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      context.startForegroundService(intent)
    } else {
      context.startService(intent)
    }
  }

  fun build(context: Context, callId: String, name: String, video: Boolean, incoming: Boolean): android.app.Notification {
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as android.app.NotificationManager
    val channel = android.app.NotificationChannel(CHANNEL, "Calls", android.app.NotificationManager.IMPORTANCE_HIGH).apply {
      lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
    }
    manager.createNotificationChannel(channel)
    val person = android.app.Person.Builder().setName(name).setImportant(true).build()
    val kind = if (video) "Video call" else "Voice call"
    val hangupIntent = actionIntent(context, callId, "hangup")
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
    val builder = android.app.Notification.Builder(context, CHANNEL)
      .setSmallIcon(android.R.drawable.ic_menu_call)
      .setContentTitle(name)
      .setContentText(kind)
      .setCategory(android.app.Notification.CATEGORY_CALL)
      .setOngoing(true)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      val style = if (incoming) {
        android.app.Notification.CallStyle.forIncomingCall(
          person,
          actionIntent(context, callId, "reject"),
          actionIntent(context, callId, "answer")
        )
      } else {
        android.app.Notification.CallStyle.forOngoingCall(person, hangupIntent)
      }
      builder.setStyle(style)
    } else if (incoming) {
      builder.addAction(notificationAction(context, callId, "reject", "Decline"))
      builder.addAction(notificationAction(context, callId, "answer", "Answer"))
    } else {
      builder.addAction(notificationAction(context, callId, "hangup", "End call"))
    }
    if (launch != null) {
      builder.setContentIntent(PendingIntent.getActivity(context, callId.hashCode(), launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
      if (incoming) builder.setFullScreenIntent(PendingIntent.getActivity(context, callId.hashCode() + 1, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE), true)
    }
    return builder.build()
  }

  fun dismiss(context: Context, callId: String) {
    stopRingtone()
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as android.app.NotificationManager
    manager.cancel(callId.hashCode())
    context.stopService(Intent(context, CallForegroundService::class.java))
  }

  fun playRingtone(context: Context) {
    stopRingtone()
    ringtone = RingtoneManager.getRingtone(context, RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE))?.apply {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) isLooping = true
      play()
    }
  }

  fun stopRingtone() {
    ringtone?.stop()
    ringtone = null
  }

  private fun actionIntent(
    context: Context,
    callId: String,
    action: String
  ): PendingIntent {
    val intent = Intent(context, CallActionReceiver::class.java).apply {
      this.action = action
      putExtra("callId", callId)
    }

    return PendingIntent.getBroadcast(
      context,
      (callId + action).hashCode(),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  private fun notificationAction(
    context: Context,
    callId: String,
    action: String,
    title: String
  ): android.app.Notification.Action {
    return android.app.Notification.Action.Builder(
      android.graphics.drawable.Icon.createWithResource(
        context,
        android.R.drawable.sym_action_call
      ),
      title,
      actionIntent(context, callId, action)
    ).build()
  }
}

object TelecomBridge {
  private val connections = mutableMapOf<String, AccompanyConnection>()

  fun handle(context: Context): PhoneAccountHandle {
    return PhoneAccountHandle(ComponentName(context, AccompanyConnectionService::class.java), "accompany")
  }

  fun ensureAccount(context: Context) {
    val telecom = context.getSystemService(Context.TELECOM_SERVICE) as TelecomManager
    val account = PhoneAccount.builder(handle(context), "Accompany")
      .setCapabilities(PhoneAccount.CAPABILITY_SELF_MANAGED)
      .build()
    telecom.registerPhoneAccount(account)
  }

  fun addIncoming(context: Context, callId: String, video: Boolean) {
    try {
      ensureAccount(context)
      val telecom = context.getSystemService(Context.TELECOM_SERVICE) as TelecomManager
      val extras = Bundle()
      extras.putParcelable(TelecomManager.EXTRA_PHONE_ACCOUNT_HANDLE, handle(context))
      extras.putString("callId", callId)
      if (video) extras.putInt(TelecomManager.EXTRA_START_CALL_WITH_VIDEO_STATE, 3)
      telecom.addNewIncomingCall(handle(context), extras)
    } catch (_: SecurityException) {
      // The CallStyle notification still represents the call.
    }
  }

  fun placeOutgoing(context: Context, callId: String, video: Boolean) {
    try {
      ensureAccount(context)
      val telecom = context.getSystemService(Context.TELECOM_SERVICE) as TelecomManager
      val extras = Bundle()
      extras.putParcelable(TelecomManager.EXTRA_PHONE_ACCOUNT_HANDLE, handle(context))
      extras.putString("callId", callId)
      if (video) extras.putInt(TelecomManager.EXTRA_START_CALL_WITH_VIDEO_STATE, 3)
      telecom.placeCall(Uri.fromParts("sip", callId, null), extras)
    } catch (_: SecurityException) {
      // The ongoing CallStyle notification remains available.
    }
  }

  fun remember(callId: String, connection: AccompanyConnection) {
    connections[callId] = connection
  }

  fun markActive(callId: String, speakerOn: Boolean) {
    connections[callId]?.let { connection ->
      connection.setActive()
      connection.setAudioRoute(speakerOn)
    }
  }

  fun setAudioRoute(callId: String, speakerOn: Boolean): Boolean {
    return connections[callId]?.setAudioRoute(speakerOn) ?: false
  }

  fun disconnect(callId: String) {
    connections.remove(callId)?.let { connection ->
      connection.setDisconnected(android.telecom.DisconnectCause(android.telecom.DisconnectCause.LOCAL))
      connection.destroy()
    }
  }
}

class AccompanyConnection(
  private val callId: String,
  private val context: Context,
) : android.telecom.Connection() {
  private var availableEndpoints: List<CallEndpoint> = emptyList()
  private var requestedSpeakerRoute: Boolean? = null

  init {
    connectionProperties = PROPERTY_SELF_MANAGED
    setAudioModeIsVoip(true)
    setCallerDisplayName(callId, android.telecom.TelecomManager.PRESENTATION_ALLOWED)
  }

  fun setAudioRoute(speakerOn: Boolean): Boolean {
    requestedSpeakerRoute = speakerOn
    if (Build.VERSION.SDK_INT >= 34) {
      try {
        requestModernAudioRoute(speakerOn)
      } catch (error: RuntimeException) {
        Log.e(TAG, "Could not request Telecom audio endpoint for $callId", error)
        @Suppress("DEPRECATION")
        setAudioRoute(if (speakerOn) CallAudioState.ROUTE_SPEAKER else CallAudioState.ROUTE_EARPIECE)
      }
      return true
    }
    if (Build.VERSION.SDK_INT >= 26) {
      @Suppress("DEPRECATION")
      setAudioRoute(if (speakerOn) CallAudioState.ROUTE_SPEAKER else CallAudioState.ROUTE_EARPIECE)
      return true
    }

    // Connection.setAudioRoute was added in API 26. On older supported devices,
    // retain the legacy route fallback while preserving Telecom routing above API 25.
    val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    @Suppress("DEPRECATION")
    audioManager.isSpeakerphoneOn = speakerOn
    return true
  }

  override fun onAvailableCallEndpointsChanged(endpoints: MutableList<CallEndpoint>) {
    super.onAvailableCallEndpointsChanged(endpoints)
    availableEndpoints = endpoints
    requestedSpeakerRoute?.let(::requestModernAudioRoute)
  }

  @Suppress("NewApi")
  private fun requestModernAudioRoute(speakerOn: Boolean) {
    val desiredType = if (speakerOn) CallEndpoint.TYPE_SPEAKER else CallEndpoint.TYPE_EARPIECE
    val endpoint = availableEndpoints.firstOrNull { it.endpointType == desiredType }
    if (endpoint == null) {
      return
    }

    requestCallEndpointChange(
      endpoint,
      context.mainExecutor,
      object : OutcomeReceiver<Void, CallEndpointException> {
        override fun onResult(result: Void?) {
        }

        override fun onError(error: CallEndpointException) {
          Log.e(TAG, "Telecom rejected audio endpoint request for $callId: ${endpoint.endpointName}", error)
          @Suppress("DEPRECATION")
          setAudioRoute(if (speakerOn) CallAudioState.ROUTE_SPEAKER else CallAudioState.ROUTE_EARPIECE)
        }
      },
    )
  }

  private companion object {
    const val TAG = "AccompanyCalls"
  }

  override fun onAnswer() {
    setActive()
    AccompanyCallsModule.emit("answer", callId)
  }

  override fun onReject() {
    setDisconnected(android.telecom.DisconnectCause(android.telecom.DisconnectCause.REJECTED))
    destroy()
    AccompanyCallsModule.emit("reject", callId)
  }

  override fun onDisconnect() {
    setDisconnected(android.telecom.DisconnectCause(android.telecom.DisconnectCause.LOCAL))
    destroy()
    AccompanyCallsModule.emit("hangup", callId)
  }
}

class AccompanyConnectionService : android.telecom.ConnectionService() {
  override fun onCreateIncomingConnection(connectionManagerPhoneAccount: PhoneAccountHandle?, request: android.telecom.ConnectionRequest?): android.telecom.Connection {
    val callId = request?.extras?.getString("callId") ?: return Connection.createFailedConnection(android.telecom.DisconnectCause(android.telecom.DisconnectCause.ERROR))
    val connection = AccompanyConnection(callId, this)
    connection.setRinging()
    TelecomBridge.remember(callId, connection)
    return connection
  }

  override fun onCreateOutgoingConnection(connectionManagerPhoneAccount: PhoneAccountHandle?, request: android.telecom.ConnectionRequest?): android.telecom.Connection {
    val callId = request?.extras?.getString("callId") ?: request?.address?.schemeSpecificPart ?: return Connection.createFailedConnection(android.telecom.DisconnectCause(android.telecom.DisconnectCause.ERROR))
    val connection = AccompanyConnection(callId, this)
    connection.setDialing()
    TelecomBridge.remember(callId, connection)
    return connection
  }
}

class CallForegroundService : android.app.Service() {
  override fun onBind(intent: Intent?): android.os.IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val callId = intent?.getStringExtra("callId") ?: return START_NOT_STICKY
    val name = intent.getStringExtra("name") ?: "Call"
    val video = intent.getBooleanExtra("video", false)
    val incoming = intent.getBooleanExtra("incoming", false)
    if (incoming) CallNotifier.playRingtone(this) else CallNotifier.stopRingtone()
    val notification = CallNotifier.build(this, callId, name, video, incoming)
    if (Build.VERSION.SDK_INT >= 34) {
      startForeground(callId.hashCode(), notification, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_PHONE_CALL)
    } else {
      startForeground(callId.hashCode(), notification)
    }
    return START_STICKY
  }
}

class CallActionReceiver : android.content.BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val callId = intent.getStringExtra("callId") ?: return
    val action = intent.action ?: return
    CallNotifier.stopRingtone()
    CallNotifier.dismiss(context, callId)
    AccompanyCallsModule.emit(action, callId)
  }
}
