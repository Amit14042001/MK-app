#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <React/RCTLinkingManager.h>

// Google Maps
#import <GoogleMaps/GoogleMaps.h>

// Firebase
#import <Firebase.h>

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application
    didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
    // ── Google Maps ──────────────────────────────────────────
    // Replace with your actual key from Google Cloud Console
    // Enable: Maps SDK for iOS, Places API, Directions API
    [GMSServices provideAPIKey:@"YOUR_GOOGLE_MAPS_API_KEY"];

    // ── Firebase ─────────────────────────────────────────────
    // GoogleService-Info.plist must be in the ios/MKApp/ folder
    [FIRApp configure];

    // ── React Native ─────────────────────────────────────────
    self.moduleName = @"MKApp";

    // Pass launchOptions to React Native
    self.initialProps = @{};

    return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

// ── Bundle URL (Dev server vs release bundle) ─────────────────
- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
    return [self bundleURL];
}

- (NSURL *)bundleURL
{
#if DEBUG
    return [[RCTBundleURLProvider sharedSettings]
        jsBundleURLForBundleRoot:@"index"];
#else
    return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

// ── Deep Links ────────────────────────────────────────────────
// Handles: mkapp://booking/123 and https://mkapp.in/booking/123
- (BOOL)application:(UIApplication *)application
    openURL:(NSURL *)url
    options:(NSDictionary<UIApplicationOpenURLOptionsKey, id> *)options
{
    return [RCTLinkingManager application:application openURL:url options:options];
}

- (BOOL)application:(UIApplication *)application
    continueUserActivity:(nonnull NSUserActivity *)userActivity
    restorationHandler:(nonnull void (^)(NSArray<id<UIUserActivityRestoring>> * _Nullable))restorationHandler
{
    return [RCTLinkingManager
        application:application
        continueUserActivity:userActivity
        restorationHandler:restorationHandler];
}

// ── Push Notifications (Firebase FCM) ────────────────────────
- (void)application:(UIApplication *)application
    didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken
{
    // Pass APNS token to Firebase for FCM
    [FIRMessaging messaging].APNSToken = deviceToken;
}

- (void)application:(UIApplication *)application
    didFailToRegisterForRemoteNotificationsWithError:(NSError *)error
{
    NSLog(@"[MKApp] Failed to register for push: %@", error);
}

@end
