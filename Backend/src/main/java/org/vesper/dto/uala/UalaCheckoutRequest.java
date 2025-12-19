package org.vesper.dto.uala;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UalaCheckoutRequest {
    private String amount;
    private String description;
    @JsonProperty("notification_url")
    private String notificationUrl;
    @JsonProperty("callback_fail")
    private String callbackFail;
    @JsonProperty("callback_success")
    private String callbackSuccess;
    @JsonProperty("external_reference")
    private String externalReference;
}