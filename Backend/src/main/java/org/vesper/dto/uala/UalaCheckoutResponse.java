package org.vesper.dto.uala;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class UalaCheckoutResponse {
    private String uuid;
    private Links links;
    
    @Data
    public static class Links {
        @JsonProperty("checkout_link")
        private String checkoutLink;
    }
}