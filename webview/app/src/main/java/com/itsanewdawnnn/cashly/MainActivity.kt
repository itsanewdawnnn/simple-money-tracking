package com.itsanewdawnnn.cashly

import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private val webUrl = "https://itsanewdawnnn.github.io/redirect/cashly.html"
    private val errorPage = "file:///android_asset/error.html"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)

        setupWebView()
        setupBackNavigation() // New helper method for back press logic

        webView.loadUrl(webUrl)
    }

    @SuppressLint("SetJavaScriptEnabled", "AddJavascriptInterface")
    private fun setupWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.allowFileAccess = true

        webView.addJavascriptInterface(WebAppInterface(), "Android")

        webView.webViewClient = object : WebViewClient() {
            // Updated to ensure we are using the modern signature
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                return false
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                if (request?.isForMainFrame == true) {
                    view?.loadUrl(errorPage)
                }
            }
        }
    }

    private fun setupBackNavigation() {
        // This callback replaces the deprecated onBackPressed() override
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    if (webView.url == errorPage) {
                        webView.loadUrl(webUrl)
                    } else {
                        webView.goBack()
                    }
                } else {
                    // Disable this callback and let the system handle the back press
                    // (which usually closes the activity)
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })
    }

    inner class WebAppInterface {
        @JavascriptInterface
        @Suppress("unused")
        fun retryConnection() {
            runOnUiThread {
                webView.loadUrl(webUrl)
            }
        }
    }
}